import os, sys, json, threading, time, base64, http.server
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

# --- local "Supabase" JWKS server -------------------------------------------------
key = ec.generate_private_key(ec.SECP256R1())
pub = jwt.algorithms.ECAlgorithm(jwt.algorithms.ECAlgorithm.SHA256).to_jwk(key.public_key(), as_dict=True)
pub.update({"kid": "k1", "alg": "ES256", "use": "sig"})
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps({"keys":[pub]}).encode())
    def log_message(self,*a): pass
srv = http.server.HTTPServer(("127.0.0.1", 8899), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = "http://127.0.0.1:8899"
os.environ["SUPABASE_URL"] = BASE
# Real Supabase serves JWKS at /auth/v1/.well-known/jwks.json: mimic with the same handler (any path)
from app.core import supabase_auth as sa
from fastapi import HTTPException

def tok(claims=None, k=key, alg="ES256", kid="k1", **over):
    c = {"sub":"u1","aud":"authenticated","iss":BASE+"/auth/v1","exp":int(time.time())+300,"is_anonymous":True,"app_metadata":{}}
    c.update(claims or {}); c.update(over)
    return jwt.encode(c, k, algorithm=alg, headers={"kid":kid})

res=[]
def expect(name, fn, ok):
    try: out = fn(); good = ok(out)
    except HTTPException as e: out=f"HTTP {e.status_code}"; good = ok(e)
    except Exception as e: out=repr(e); good = ok(e)
    res.append(good); print(("PASS " if good else "FAIL ")+name+("" if good else f"   -> {out}"))

user = lambda t: sa.to_user(sa.decode_token(t), t)
expect("valid anonymous family token accepted", lambda: user(tok()), lambda u: u.id=="u1" and u.role=="family" and u.is_anonymous)
expect("counsellor role read from app_metadata", lambda: user(tok(app_metadata={"role":"counsellor"}, is_anonymous=False)), lambda u: u.role=="counsellor")
expect("admin role read from app_metadata", lambda: user(tok(app_metadata={"role":"admin"})), lambda u: u.role=="admin")
expect("user_metadata role=admin is IGNORED", lambda: user(tok(user_metadata={"role":"admin"})), lambda u: u.role=="family")
expect("unknown role string falls back to family", lambda: user(tok(app_metadata={"role":"superuser"})), lambda u: u.role=="family")
expect("expired token rejected", lambda: user(tok(exp=int(time.time())-10)), lambda e: isinstance(e,HTTPException) and e.status_code==401)
expect("wrong audience rejected", lambda: user(tok(aud="anon")), lambda e: isinstance(e,HTTPException) and e.status_code==401)
expect("wrong issuer rejected", lambda: user(tok(iss="https://evil.example/auth/v1")), lambda e: isinstance(e,HTTPException) and e.status_code==401)
other = ec.generate_private_key(ec.SECP256R1())
expect("token signed with attacker's key rejected", lambda: user(tok(k=other)), lambda e: isinstance(e,HTTPException) and e.status_code==401)
expect("missing exp rejected", lambda: user(jwt.encode({"sub":"u1","aud":"authenticated","iss":BASE+"/auth/v1"}, key, algorithm="ES256", headers={"kid":"k1"})), lambda e: isinstance(e,HTTPException) and e.status_code==401)
expect("alg=none token rejected", lambda: user(base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")+"."+base64.urlsafe_b64encode(json.dumps({"sub":"u1","aud":"authenticated","iss":BASE+"/auth/v1","exp":int(time.time())+300,"app_metadata":{"role":"admin"}}).encode()).decode().rstrip("=")+"."), lambda e: isinstance(e,HTTPException) and e.status_code==401)
# algorithm confusion: HS256 token "signed" with the PUBLIC key bytes, no legacy secret configured
pem = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
forged = jwt.encode({"sub":"x","aud":"authenticated","iss":BASE+"/auth/v1","exp":int(time.time())+300,"app_metadata":{"role":"admin"}}, "stolen-public-key-as-secret", algorithm="HS256", headers={"kid":"k1"})
expect("HS256 forgery rejected when no legacy secret configured", lambda: user(forged), lambda e: isinstance(e,HTTPException) and e.status_code==401)
os.environ["SUPABASE_JWT_SECRET"]="legacy-secret-legacy-secret-legacy-12"
expect("legacy HS256 project secret accepted when configured", lambda: user(tok(k="legacy-secret-legacy-secret-legacy-12", alg="HS256")), lambda u: u.id=="u1")
expect("HS256 signed with a different secret still rejected", lambda: user(forged), lambda e: isinstance(e,HTTPException) and e.status_code==401)
expect("garbage token rejected", lambda: user("not.a.jwt"), lambda e: isinstance(e,HTTPException) and e.status_code==401)

# --- route-level behaviour through FastAPI ---
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
app = FastAPI()
@app.get("/admin/x")
def a(u=Depends(sa.admin_user)): return {"ok":u.role}
@app.get("/counsellor/x")
def c(u=Depends(sa.counsellor_user)): return {"ok":u.role}
@app.post("/chat")
def f(u=Depends(sa.family_user)): return {"ok":u.id}
cl = TestClient(app)
H_ = lambda t: {"Authorization": "Bearer "+t}
def code(r): return r.status_code
expect("no token -> 401 on /admin", lambda: cl.get("/admin/x"), lambda r: code(r)==401)
expect("family token -> 403 on /admin", lambda: cl.get("/admin/x", headers=H_(tok())), lambda r: code(r)==403)
expect("counsellor token -> 403 on /admin", lambda: cl.get("/admin/x", headers=H_(tok(app_metadata={"role":"counsellor"}))), lambda r: code(r)==403)
expect("admin token -> 200 on /admin", lambda: cl.get("/admin/x", headers=H_(tok(app_metadata={"role":"admin"}))), lambda r: code(r)==200)
expect("counsellor token -> 200 on /counsellor", lambda: cl.get("/counsellor/x", headers=H_(tok(app_metadata={"role":"counsellor"}))), lambda r: code(r)==200)
expect("family token -> 403 on /counsellor", lambda: cl.get("/counsellor/x", headers=H_(tok())), lambda r: code(r)==403)
expect("anonymous family -> 200 on /chat", lambda: cl.post("/chat", headers=H_(tok())), lambda r: code(r)==200)
expect("admin token -> 403 on family /chat", lambda: cl.post("/chat", headers=H_(tok(app_metadata={"role":"admin"}))), lambda r: code(r)==403)
print(f"\n{sum(res)}/{len(res)} checks passed"); sys.exit(0 if all(res) else 1)
