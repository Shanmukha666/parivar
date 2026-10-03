import subprocess, json, uuid, sys
P = ["psql","-h","/tmp","-p","5433","-U","postgres","-d","t","-X","-q","-t","-A","-v","ON_ERROR_STOP=0"]

def sql(q, role=None, claims=None):
    pre = ""
    if role:
        pre += f"set role {role};"
        if claims is not None:
            pre += f"set request.jwt.claims = '{json.dumps(claims)}';"
    r = subprocess.run(P+["-c", pre+q], capture_output=True, text=True)
    return (r.stdout.strip(), r.stderr.strip())

def admin(q): return sql(q)  # superuser/owner

results=[]
def check(name, cond, detail=""):
    results.append(cond); print(("PASS " if cond else "FAIL ")+name+(f"   [{detail}]" if (detail and not cond) else ""))

# ---- seed users and reference data
fam_a, fam_b, couns_a, couns_b, adm = [str(uuid.uuid4()) for _ in range(5)]
def mk(uid, role=None, anon=False):
    meta = json.dumps({"role": role} if role else {})
    admin(f"insert into auth.users(id, raw_app_meta_data, is_anonymous) values ('{uid}','{meta}',{str(anon).lower()})")
mk(fam_a, anon=True); mk(fam_b, anon=True); mk(couns_a,"counsellor"); mk(couns_b,"counsellor"); mk(adm,"admin")
admin("insert into districts values ('Telangana','Warangal'),('Telangana','Hyderabad')")
admin("insert into trades(name_en,sector) values ('Electrician','Electrical')")
admin("insert into outcomes(trade_id,state,district,cohort_year,placement_rate,sample_size,source) values (1,'Telangana','Warangal',2024,78,42,'sample')")

def claims(uid, role=None, anon=False, user_meta=None):
    c={"sub":uid,"role":"authenticated","is_anonymous":anon,"app_metadata":{}}
    if role: c["app_metadata"]["role"]=role
    if user_meta: c["user_metadata"]=user_meta
    return c
A=claims(fam_a,anon=True); B=claims(fam_b,anon=True); CA=claims(couns_a,"counsellor"); CB=claims(couns_b,"counsellor"); AD=claims(adm,"admin")

print("== Reference data / anon")
o,e = sql("select count(*) from trades","anon"); check("anon can read trades", o=="1", e)
o,e = sql("select count(*) from sessions","anon"); check("anon cannot read sessions", "permission denied" in e, e or o)
o,e = sql("insert into trades(name_en,sector) values ('x','y')","authenticated",A); check("family cannot write trades", "permission denied" in e, e or o)

print("== Sessions")
o,e = sql("insert into sessions(lang,state,district,user_role,learner_class,income_bracket,consent) values ('en','Telangana','Warangal','both','Class 10','1-3L',true) returning id","authenticated",A)
sess_a = o.split("\n")[0].strip(); check("family A creates own session", len(sess_a)==36, e)
o,e = sql("insert into sessions(lang,state,district,user_role,learner_class,income_bracket,consent) values ('en','Telangana','Warangal','both','x','y',false)","authenticated",A); check("session without consent rejected", "check" in e or "policy" in e, e or o)
o,e = sql("insert into sessions(lang,state,district,user_role,learner_class,income_bracket,consent) values ('en','Telangana','<script>alert(1)</script>','both','x','y',true)","authenticated",A); check("unknown/XSS district rejected by FK", "foreign key" in e, e or o)
o,e = sql(f"insert into sessions(owner_id,lang,state,district,user_role,learner_class,income_bracket,consent) values ('{fam_b}','en','Telangana','Warangal','both','x','y',true)","authenticated",A); check("cannot create session owned by someone else", "row-level security" in e, e or o)
o,e = sql("select count(*) from sessions","authenticated",B); check("family B cannot see A's session", o=="0", e)
o,e = sql(f"update sessions set owner_id='{fam_b}' where id='{sess_a}'","authenticated",A); check("cannot reassign session ownership (column grant)", "permission denied" in e, e or o)
o,e = sql(f"update sessions set selected_trade_id=1 where id='{sess_a}' returning selected_trade_id","authenticated",A); check("can set own selected trade", o.startswith("1"), e)

print("== Messages / classifier")
o,e = sql(f"insert into messages(session_id,speaker,text) values ('{sess_a}','parent','hi')","authenticated",A); check("family cannot inject messages without live counsellor", "row-level security" in e, e or o)
for i,(txt,s) in enumerate([("worried about money",-0.6),("still worried",-0.5),("what about safety",-0.4),("ok maybe",0.1),("sounds good",0.5)]):
    mid,_ = admin(f"insert into messages(session_id,speaker,text) values ('{sess_a}','parent','{txt}') returning id")
    mid = mid.split("\n")[0]
    admin(f"insert into message_analysis(message_id,objection_category,sentiment) values ({mid},'{'income' if i<2 else 'safety' if i==2 else 'none'}',{s})")
o,e = sql("select count(*) from message_analysis","authenticated",A); check("family cannot read classifier output", "permission denied" in e, e or o)
o,e = sql("select count(*) from messages","authenticated",A); check("family reads own messages", o=="5", e)
o,e = sql("select count(*) from messages","authenticated",B); check("family B reads none", o=="0", e)
o,e = sql("select count(*) from messages","authenticated",AD); check("ADMIN cannot read raw messages (data minimisation)", o=="0", e)
o,e = sql("select count(*) from messages","authenticated",CA); check("counsellor sees nothing before any escalation", o=="0", e)

print("== Escalation, phone masking, takeover")
o,e = sql(f"insert into escalations(session_id,reason) values ('{sess_a}','wants human') returning id","authenticated",A); esc=o.split("\n")[0].strip(); check("family creates escalation", esc.isdigit(), e)
o,e = sql(f"insert into escalations(session_id,reason,status,counsellor_id) values ('{sess_a}','x','active','{couns_a}')","authenticated",A); check("family cannot self-assign a counsellor", "row-level security" in e or "check" in e, e or o)
o,e = sql(f"insert into escalation_contacts values ({esc},'9876543210')","authenticated",A); check("family stores callback phone", "INSERT" in o or e=="" , e or o)
o,e = sql(f"insert into escalation_contacts values ({esc},'12345')","authenticated",A); check("bad phone number rejected", "check" in e or "violates" in e, e or o)
o,e = sql("select count(*) from escalations","authenticated",CA); check("counsellor A sees queued ticket", o=="1", e)
o,e = sql("select count(*) from escalation_contacts","authenticated",CA); check("phone HIDDEN before accepting", o=="0", e)
o,e = sql("select count(*) from messages","authenticated",CA); check("counsellor can read transcript to triage", o=="5", e)
o,e = sql(f"update escalations set status='active', counsellor_id='{couns_a}' where id={esc} returning status","authenticated",CA); check("counsellor A accepts ticket", o.startswith("active"), e)
o,e = sql(f"select accepted_at is not null from escalations where id={esc}","authenticated",CA); check("accepted_at stamped by trigger", o=="t", e)
o,e = sql("select count(*) from escalation_contacts","authenticated",CA); check("phone VISIBLE after accepting", o=="1", e)
o,e = sql("select count(*) from escalations","authenticated",CB); check("counsellor B cannot see A's active ticket", o=="0", e)
o,e = sql("select count(*) from messages","authenticated",CB); check("counsellor B cannot read A's transcript", o=="0", e)
o,e = sql(f"update escalations set status='resolved' where id={esc}","authenticated",CB); check("counsellor B cannot resolve A's ticket", o in ("","UPDATE 0") and "permission" not in e, e or o)
o,e = sql(f"update escalations set counsellor_id='{couns_b}' where id={esc}","authenticated",CA); check("counsellor cannot hand off by editing counsellor_id to someone else", "row-level security" in e, e or o)
o,e = sql(f"insert into messages(session_id,speaker,text) values ('{sess_a}','counsellor','Namaste, this is your counsellor')","authenticated",CA); check("assigned counsellor can message", "INSERT" in o or e=="", e)
o,e = sql(f"insert into messages(session_id,speaker,text) values ('{sess_a}','counsellor','intruder')","authenticated",CB); check("other counsellor cannot message", "row-level security" in e, e or o)
o,e = sql(f"insert into messages(session_id,speaker,text) values ('{sess_a}','parent','thank you')","authenticated",A); check("family can reply once ticket is active", "INSERT" in o or e=="", e)
o,e = sql(f"insert into messages(session_id,speaker,text) values ('{sess_a}','counsellor','fake counsellor')","authenticated",A); check("family cannot impersonate a counsellor", "row-level security" in e, e or o)
o,e = sql(f"update escalations set resolved_at=now()-interval '10 days' where id={esc}","authenticated",CA); check("cannot forge resolved_at (column grant)", "permission denied" in e, e or o)
o,e = sql(f"update escalations set status='resolved', family_changed_mind=true where id={esc} returning resolved_at is not null","authenticated",CA); check("resolve + record 'changed mind' outcome", o.startswith("t"), e)
o,e = sql("select count(*) from audit_log where entity='escalations'","authenticated",AD); check("admin can read audit trail (accept+resolve = 2)", o=="2", e)
o,e = sql("select count(*) from audit_log","authenticated",CA); check("counsellor sees zero audit rows (policy filters)", o=="0", e or o)

print("== Privilege escalation attempts")
o,e = sql("select app.is_admin()","authenticated",claims(fam_a,anon=True,user_meta={"role":"admin"})); check("user_metadata role=admin is IGNORED", o=="f", e)
o,e = sql("select app.is_admin()","authenticated",AD); check("app_metadata role=admin recognised", o=="t", e)
o,e = sql("select admin_kpis()","authenticated",A); check("family cannot call admin_kpis", "forbidden" in e, e or o)
o,e = sql("select admin_kpis()","authenticated",CA); check("counsellor cannot call admin_kpis", "forbidden" in e, e or o)
o,e = sql("select admin_kpis()","anon"); check("anon cannot even execute admin_kpis", "permission denied" in e, e or o)
o,e = sql("update profiles set preferred_lang='hi' where id='"+fam_a+"' returning preferred_lang","authenticated",A); check("family edits own profile language", o.startswith("hi"), e)

print("== Admin aggregates and k-anonymity")
o,e = sql("select (admin_kpis()->>'total_sessions')::int, admin_kpis()->'avg_sentiment_shift'","authenticated",AD)
check("with 1 session: shift is NULL, not a fake number", o.endswith("|null") or o.endswith("|"), o or e)
o,e = sql("select session_count, resistance_index is null, low_sample from admin_district_resistance()","authenticated",AD); check("<10 sessions: resistance suppressed", o=="1|t|t", o or e)
# add 11 more sessions in Warangal so the district clears k=10
for i in range(11):
    u=str(uuid.uuid4()); mk(u,anon=True)
    sid,_ = admin(f"insert into sessions(owner_id,lang,state,district,user_role,learner_class,income_bracket,consent) values ('{u}','hi','Telangana','Warangal','parent','x','y',true) returning id"); sid=sid.split("\n")[0]
    if i<5: admin(f"insert into escalations(session_id,reason,status,counsellor_id) values ('{sid}','r','active','{couns_a}')")
    for j,s in enumerate([-0.7,-0.6,-0.3,0.2,0.5]):
        mid,_=admin(f"insert into messages(session_id,speaker,text) values ('{sid}','parent','m{j}') returning id"); mid=mid.split("\n")[0]
        admin(f"insert into message_analysis(message_id,objection_category,sentiment) values ({mid},'{'status' if j<3 else 'none'}',{s})")
o,e = sql("select session_count, resistance_index, escalation_rate, share_negative_start, mean_sentiment_shift from admin_district_resistance()","authenticated",AD)
print("   district row:", o or e)
cols=o.split("|") if o else []
check("12 sessions: resistance index computed", len(cols)==5 and cols[1] not in ("",), o or e)
check("sentiment shift is positive (families improving)", len(cols)==5 and float(cols[4])>0.5, o)
o,e = sql("select (admin_kpis()->>'avg_sentiment_shift')::numeric > 0 from admin_kpis()","authenticated",AD); check("KPI shift now real (>=10 sessions)", o=="t", o or e)
o,e = sql("select objection, session_count, share from admin_objection_breakdown() order by 2 desc","authenticated",AD); print("   objections:", o.replace("\n"," ; ")); check("objection breakdown returns rows", "status" in o, e)

print("== Delete my data")
o,e = sql(f"delete from sessions where id='{sess_a}'","authenticated",A); check("family deletes own session", "DELETE" in o or e=="", e)
o,e = sql(f"select (select count(*) from messages where session_id='{sess_a}') + (select count(*) from escalations where session_id='{sess_a}') + (select count(*) from escalation_contacts)","authenticated",claims(adm,"admin")); 
o2,_ = admin(f"select (select count(*) from messages where session_id='{sess_a}'),(select count(*) from escalations where session_id='{sess_a}'),(select count(*) from escalation_contacts)")
check("cascade removed messages, escalation and phone", o2=="0|0|0", o2)

print(f"\n{sum(results)}/{len(results)} checks passed")
sys.exit(0 if all(results) else 1)
