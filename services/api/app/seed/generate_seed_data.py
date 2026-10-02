import csv
import json
import os
import random
import uuid
from datetime import datetime, timedelta

def get_random_date(start, end):
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))

def main():
    seed_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(seed_dir, exist_ok=True)

    # 1. TRADES (12 trades)
    trades = [
        (1, "Electrician", json.dumps({"hi": "इलेक्ट्रीशियन", "te": "ఎలక్ట్రీషియన్"}), "Electrical", 4, 24, "Class 10 Pass", "Safety goggles, insulated gloves, rubber sole boots", ["House Wiring", "Industrial Electrician", "Maintenance Technician"], json.dumps({"en": "Install and repair electrical wiring and machines", "hi": "बिजली की वायरिंग और मशीनों की मरम्मत करना", "te": "విద్యుత్ వైరింగ్ మరియు యంత్రాలను మరమ్మతు చేయడం"})),
        (2, "Plumber", json.dumps({"hi": "प्लंबर", "te": "ప్లంబర్"}), "Construction", 4, 12, "Class 8 Pass", "Gloves, safety footwear, eye shield", ["Pipe Fitter", "Sanitary Installer", "Plumbing Contractor"], json.dumps({"en": "Fix water pipes, drains, and bathroom fittings", "hi": "पानी के पाइप, नालियां और सेनेटरी फिटिंग ठीक करना", "te": "నీటి పైపులు, డ్రైనేజీ మరియు బాత్‌రూమ్ అమరికలను బాగు చేయడం"})),
        (3, "Welder", json.dumps({"hi": "वेल्डर", "te": "వెల్డర్"}), "Manufacturing", 4, 12, "Class 8 Pass", "Welding helmet, leather apron, heavy boots", ["Arc Welder", "Gas Welder", "Structural Fabricator"], json.dumps({"en": "Join metal parts using heat and electricity", "hi": "गर्मी और बिजली से धातु के पुर्जों को जोड़ना", "te": "వేడి మరియు విద్యుత్‌తో లోహ భాగాలను అతికించడం"})),
        (4, "Fitter", json.dumps({"hi": "फिटर", "te": "ఫిట్టర్"}), "Manufacturing", 5, 24, "Class 10 Pass", "Safety glasses, ear protection, steel toe shoes", ["Assembly Technician", "Machine Operator", "Plant Maintenance Fitter"], json.dumps({"en": "Assemble and test complex machinery parts", "hi": "मशीनों के पुर्जों को जोड़ना और जांचना", "te": "యంత్ర భాగాలను అమర్చడం మరియు పరీక్షించడం"})),
        (5, "Automobile Mechanic", json.dumps({"hi": "ऑटो मैकेनिक", "te": "ఆటో మొబైల్ మెకానిక్"}), "Automotive", 4, 24, "Class 10 Pass", "Grease-resistant gloves, eye protection", ["Auto Service Tech", "Engine Specialist", "Garage Supervisor"], json.dumps({"en": "Service, diagnose and repair two-wheelers and four-wheelers", "hi": "गाड़ियों की सर्विसिंग और खराबी ठीक करना", "te": "ద్విచక్ర మరియు నాలుగు చక్రాల వాహనాల మరమ్మతు చేయడం"})),
        (6, "Solar Technician", json.dumps({"hi": "सोलर तकनीशियन", "te": "సోలార్ టెక్నీషియన్"}), "Green Energy", 4, 12, "Class 10 Pass", "Rooftop harness, electrical gloves, hard hat", ["Rooftop Installer", "PV Maintenance Specialist", "Solar Consultant"], json.dumps({"en": "Install rooftop solar panels and inverters", "hi": "छत पर सोलर पैनल और इन्वर्टर लगाना", "te": "పైకప్పుపై సోలార్ ప్యానెల్స్ మరియు ఇన్వర్టర్లను ఏర్పాటు చేయడం"})),
        (7, "CNC Operator", json.dumps({"hi": "सीएनसी ऑपरेटर", "te": "సీఎన్సీ ఆపరేటర్"}), "Manufacturing", 4, 12, "Class 10 Pass", "Safety glasses, chip guard", ["CNC Turner", "CNC Milling Operator", "Quality Inspector"], json.dumps({"en": "Operate computer-controlled cutting and shaping machines", "hi": "कंप्यूटर से चलने वाली मशीनों को संचालित करना", "te": "కంప్యూటర్ ఆధారిత యంత్రాలను నడపడం"})),
        (8, "Beautician & Wellness", json.dumps({"hi": "ब्यूटीशियन", "te": "బ్యూటీషియన్"}), "Beauty & Wellness", 3, 6, "Class 8 Pass", "Hygienic aprons, skin patch testing protocols", ["Salon Specialist", "Bridal Stylist", "Spa Therapist"], json.dumps({"en": "Skincare, haircare, makeup and salon management", "hi": "त्वचा, बाल और सौंदर्य सेवाएं देना", "te": "చర్మానికి మరియు జుట్టుకు సంబంధించిన సౌందర్య సేవలు"})),
        (9, "Tailoring & Fashion", json.dumps({"hi": "सिलाई और फैशन", "te": "టైలరింగ్ & ఫ్యాషన్"}), "Apparel", 3, 6, "Class 8 Pass", "Needle guard, ergonomic seating", ["Boutique Tailor", "Pattern Maker", "Garment Supervisor"], json.dumps({"en": "Measure, cut, stitch garments and design clothes", "hi": "कपड़े नापना, काटना और सिलना", "te": "బట్టలు కొలవడం, కత్తిరించడం మరియు కుట్టడం"})),
        (10, "Data Entry & CSC Operator", json.dumps({"hi": "डेटा एंट्री ऑपरेटर", "te": "డేటా ఎంట్రీ ఆపరేటర్"}), "IT & ITES", 3, 6, "Class 10 Pass", "Ergonomic keyboard, screen blue-light filters", ["CSC Center Manager", "Office Assistant", "Typing Specialist"], json.dumps({"en": "Manage digital services, paperwork, and computer entries", "hi": "कंप्यूटर पर ऑनलाइन फॉर्म और दस्तावेज संभालना", "te": "కంప్యూటర్‌లో సమాచారం నమోదు మరియు ఆన్‌లైన్ సేవలు నిర్వహించడం"})),
        (11, "HVAC & AC Technician", json.dumps({"hi": "एसी तकनीशियन", "te": "ఏసీ టెక్నీషియన్"}), "Electronics", 4, 24, "Class 10 Pass", "Refrigerant pressure gauge, electrical tester", ["AC Installation Specialist", "Chiller Technician", "Commercial HVAC Lead"], json.dumps({"en": "Install and repair domestic and industrial air conditioners", "hi": "एसी और फ्रिज की मरम्मत और सर्विसिंग", "te": "ఏసీలు మరియు శీతలీకరణ యంత్రాల మరమ్మతు"})),
        (12, "Mobile Phone Repair Tech", json.dumps({"hi": "मोबाइल रिपेयर", "te": "మొబైల్ ఫోన్ రిపేర్"}), "Electronics", 4, 6, "Class 8 Pass", "ESD grounding wristband, magnifying lamp", ["Hardware Repair Tech", "Software Flashing Specialist", "Service Center Lead"], json.dumps({"en": "Diagnose, fix screens, chips, and software in smartphones", "hi": "स्मार्टफोन की स्क्रीन, बैटरी और सॉफ्टवेयर ठीक करना", "te": "స్మార్ట్‌ఫోన్ల స్క్రీన్, బ్యాటరీ మరియు సాఫ్ట్‌వేర్ మరమ్మతు చేయడం"}))
    ]

    with open(os.path.join(seed_dir, 'trades.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name_en", "name_local", "sector", "nsqf_level", "duration_months", "entry_qualification", "safety_notes", "job_roles", "description_simple"])
        for t in trades:
            writer.writerow([t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], json.dumps(t[8]), t[9]])

    # 2. PROVIDERS (30 providers across 10 districts in 3 states)
    states_districts = {
        "Telangana": ["Hyderabad", "Warangal", "Karimnagar"],
        "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
        "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"]
    }
    
    providers = []
    pid = 1
    for state, dists in states_districts.items():
        for dist in dists:
            for idx in range(3):
                p_type = ["Government ITI", "PMKVY Skill Hub", "Polytechnic Centre"][idx]
                accred = ["NCVT Verified", "NSDC Certified", "State Board Accredited"][idx]
                fee = [1200, 0, 18500][idx]
                contact = f"040-{random.randint(20000000, 29999999)}" if state == "Telangana" else f"0755-{random.randint(2000000, 2999999)}"
                providers.append((pid, f"{dist} {p_type}", p_type, state, dist, accred, fee, contact))
                pid += 1

    with open(os.path.join(seed_dir, 'providers.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name", "type", "state", "district", "accreditation", "fee_inr", "contact"])
        for p in providers:
            writer.writerow(p)

    # 3. OUTCOMES (300 rows)
    outcomes = []
    oid = 1
    for tr in trades:
        tid = tr[0]
        for p in providers:
            p_id = p[0]
            p_state = p[3]
            p_dist = p[4]

            # Realistic variation by trade
            base_sal = 15000 if tid in [1, 4, 6, 7, 11] else (13000 if tid in [2, 3, 5, 12] else 11000)
            base_placement = 82 if tid in [1, 6, 7, 10] else 74

            # Ensure high resistance districts (Warangal, Gwalior) have some small samples (<20) to test state fallback
            if p_dist in ["Warangal", "Gwalior"] and oid % 3 == 0:
                ss = random.randint(12, 18)  # <20 triggers fallback
            else:
                ss = random.randint(24, 110)

            pr = max(55, min(92, base_placement + random.randint(-8, 8)))
            avg_sal = base_sal + random.randint(-1500, 2500)
            sal_min = int(avg_sal * 1.35)
            sal_max = int(avg_sal * 2.1)
            se_rate = random.randint(8, 28)

            outcomes.append((
                oid, tid, p_id, p_state, p_dist, random.choice([2023, 2024]),
                pr, avg_sal, sal_min, sal_max, se_rate, ss,
                "State Skill Mission & NCVT Portal", "2024-03-15"
            ))
            oid += 1
            if oid > 300:
                break
        if oid > 300:
            break

    with open(os.path.join(seed_dir, 'outcomes.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "trade_id", "provider_id", "state", "district", "cohort_year", "placement_rate", "avg_start_salary_inr", "salary_3yr_min", "salary_3yr_max", "self_employment_rate", "sample_size", "source", "verified_on"])
        for o in outcomes:
            writer.writerow(o)

    # 4. PATHWAYS (24 steps, 2 per trade)
    pathways = []
    pwid = 1
    for tr in trades:
        tid = tr[0]
        name = tr[1]
        nsqf = tr[4]
        pathways.append((pwid, tid, 1, f"Certified {name}", nsqf, "Advanced Diploma", f"Site {name} / Junior Technician", f"₹14,000 - ₹18,000"))
        pwid += 1
        pathways.append((pwid, tid, 2, f"Lead Specialist & Supervisor", nsqf + 1, "B.Voc / Polytechnic Lateral", f"Section In-Charge / Contractor", f"₹26,000 - ₹38,000"))
        pwid += 1

    with open(os.path.join(seed_dir, 'pathways.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "from_trade_id", "step_order", "step_title", "nsqf_level", "next_education", "typical_role", "typical_salary_range"])
        for pw in pathways:
            writer.writerow(pw)

    # 5. SCHEMES (8 schemes)
    schemes = [
        (1, "PM Vishwakarma Scheme", None, json.dumps({"income_bracket": "All", "min_class": "Class 8"}), "₹15,000 tool kit incentive + 500/day stipend during training + 5% subsidized loan", "Online at pmvishwakarma.gov.in or CSC", "MSDE Official Portal"),
        (2, "PMKVY 4.0 Free Training", None, json.dumps({"income_bracket": "Below 3 Lakhs", "min_class": "Class 8"}), "100% course fee waiver + free study material + assessment support", "Directly at accredited PMKVY Skill Hub", "Skill India Digital Hub"),
        (3, "Telangana State Dalit Bandhu (Skilling Component)", "Telangana", json.dumps({"income_bracket": "Below 2 Lakhs", "category": "SC"}), "₹10,000 initial startup equipment allowance post ITI graduation", "District Collectorate / TS Skill Mission", "Govt of Telangana"),
        (4, "Telangana Overseas & Advanced Technical Fellowship", "Telangana", json.dumps({"income_bracket": "Below 5 Lakhs", "min_class": "Class 10"}), "Free placement counseling and lateral entry subsidy for polytechnic", "TS ePass Portal", "TS Department of Technical Education"),
        (5, "MP Mukhyamantri Kaushalya Yojana", "Madhya Pradesh", json.dumps({"gender": "Female", "min_class": "Class 8"}), "Free residential vocational training + hostel + placement guarantee for girls", "MP Skill Portal (ssdm.mp.gov.in)", "MP Skill Development Mission"),
        (6, "MP Seekho Kamao Yojana (Learn & Earn)", "Madhya Pradesh", json.dumps({"age": "18-29", "min_class": "Class 10"}), "Monthly stipend of ₹8,000 to ₹10,000 directly to bank account during apprenticeship", "mmsky.mp.gov.in", "Govt of Madhya Pradesh"),
        (7, "Rajasthan Kaushal Vikas Kendra Subsidy", "Rajasthan", json.dumps({"income_bracket": "BPL", "min_class": "Class 8"}), "100% scholarship for ITI admission + ₹2,000 monthly travel stipend", "Emitra Kiosks across Rajasthan", "RSLDC Rajasthan"),
        (8, "National Apprenticeship Promotion Scheme (NAPS)", None, json.dumps({"income_bracket": "All", "min_class": "Class 10"}), "Govt pays 25% of prescribed stipend up to ₹1,500/month to industry employers", "apprenticeshipindia.gov.in", "MSDE NAPS Division")
    ]

    with open(os.path.join(seed_dir, 'schemes.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name", "state", "eligibility", "benefit", "how_to_apply", "source"])
        for s in schemes:
            writer.writerow(s)

    # 6. STORIES (20 local learner success stories)
    stories_data = [
        (1, 1, "Warangal", "Ramesh Goud", json.dumps({"en": "My parents wanted me to wait for degree college, but ITI Electrician landed me a job at L&T in 14 months.", "hi": "मेरे माता-पिता डिग्री का इंतजार करने को कह रहे थे, लेकिन 14 महीने में मुझे एलएंडटी में अच्छी नौकरी मिल गई।", "te": "మా నాన్న డిగ్రీ చేయమన్నారు, కానీ ఐటీఐ ద్వారా 14 నెలల్లో ఎల్ అండ్ టీ లో మంచి ఉద్యోగం వచ్చింది."}), "Earning ₹22,000/month as Industrial Electrician", True),
        (2, 6, "Hyderabad", "Ananya Reddy", json.dumps({"en": "Solar installation is in huge demand in Telangana. I started my own rooftop setup agency.", "hi": "सौर ऊर्जा की बहुत मांग है। आज मैं अपनी एजेंसी चलाती हूँ।", "te": "సోలార్ ప్యానెల్స్‌కు మంచి డిమాండ్ ఉంది. నేను స్వంతంగా ఏజెన్సీ ప్రారంభించాను."}), "Self-employed, monthly earnings ₹35,000+", True),
        (3, 4, "Gwalior", "Vikram Singh", json.dumps({"en": "Fitter course was practical. I am now supervisor in Indian Railways carriage workshop.", "hi": "फिटर ट्रेड से रेलवे वर्कशॉप में सीधे अवसर मिला।", "te": "ఫిట్టర్ కోర్సు వల్ల రైల్వే వర్క్‌షాప్‌లో సూపర్వైజర్ పోస్ట్ వచ్చింది."}), "Government Workshop Supervisor, ₹28,000/month", True),
        (4, 8, "Indore", "Pooja Sharma", json.dumps({"en": "With the 6-month beautician course, I opened my salon near Rajwada and support my family.", "hi": "6 महीने के ब्यूटीशियन कोर्स के बाद मैंने अपना सैलून खोला।", "te": "ఆరు నెలల బ్యూటీషియన్ కోర్సుతో నేను సొంత సెలూన్ ప్రారంభించాను."}), "Salon owner, net income ₹24,000/month", True),
        (5, 7, "Jaipur", "Mohit Meena", json.dumps({"en": "CNC machining allowed me to step directly into auto-components manufacturing.", "hi": "सीएनसी ट्रेनिंग से मुझे ऑटोमोबाइल मैन्युफैक्चरिंग कंपनी में अच्छी नौकरी मिली।", "te": "సీఎన్సీ ట్రైనింగ్ వల్ల ఆటోమొబైల్ పరిశ్రమలో మంచి హోదా లభించింది."}), "Senior CNC Operator, ₹21,500/month", True),
        (6, 11, "Bhopal", "Sunil Verma", json.dumps({"en": "Commercial HVAC requires real expertise. Within 2 years I got promoted to lead technician.", "hi": "एसी तकनीशियन का काम बहुत सम्मानजनक है और आमदनी नियमित है।", "te": "హెచ్‌విఏసీ టెక్నీషియన్ కావడంతో రెగ్యులర్ ఆదాయం మరియు గౌరవం ఉంది."}), "Lead HVAC Specialist, ₹26,000/month", True)
    ]
    # Expand to 20
    for i in range(7, 21):
        tr = random.choice(trades)
        d = random.choice(["Warangal", "Hyderabad", "Bhopal", "Gwalior", "Jaipur", "Udaipur", "Indore", "Karimnagar"])
        stories_data.append((
            i, tr[0], d, f"Alumnus {i} ({tr[1]})",
            json.dumps({"en": f"Graduating in {tr[1]} gave my family financial stability within one year.", "hi": f"{tr[1]} कोर्स करने से एक साल के अंदर परिवार को सहारा मिला।", "te": f"{tr[1]} కోర్సు పూర్తి చేసి ఒక సంవత్సరంలో కుటుంబానికి అండగా నిలిచాను."}),
            f"Employed at accredited center, ₹18,000/month", True
        ))

    with open(os.path.join(seed_dir, 'stories.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "trade_id", "district", "name", "quote", "outcome", "is_synthetic"])
        for st in stories_data:
            writer.writerow(st)

    # 7. SESSIONS (300 sessions) & MESSAGES (approx 1500) & MESSAGE_ANALYSIS & ESCALATIONS & EVENTS
    high_res_districts = ["Warangal", "Gwalior", "Udaipur"]
    med_res_districts = ["Karimnagar", "Jabalpur", "Jodhpur"]
    low_res_districts = ["Hyderabad", "Bhopal", "Indore", "Jaipur"]

    all_districts = high_res_districts + med_res_districts + low_res_districts

    sessions = []
    messages = []
    message_analyses = []
    escalations = []
    events = []

    mid_counter = 1
    esc_counter = 1
    event_counter = 1

    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 9, 30)

    for s_idx in range(1, 301):
        sid = str(uuid.uuid4())
        lang = random.choice(["en", "hi", "te"])
        dist = random.choice(all_districts)
        
        # State mapping
        if dist in ["Hyderabad", "Warangal", "Karimnagar"]:
            state = "Telangana"
        elif dist in ["Bhopal", "Indore", "Jabalpur", "Gwalior"]:
            state = "Madhya Pradesh"
        else:
            state = "Rajasthan"

        role = random.choice(["both", "parent", "learner"])
        cls = random.choice(["Class 8 Pass", "Class 10 Pass", "Class 12 Pass"])
        inc = random.choice(["Below ₹1 Lakh", "₹1 - 3 Lakhs", "₹3 - 5 Lakhs"])
        tid = random.choice(trades)[0]
        c_at = get_random_date(start_date, end_date)

        sessions.append((sid, lang, state, dist, role, cls, inc, tid, True, c_at.isoformat()))

        # Determine resistance characteristics
        is_high = dist in high_res_districts
        is_med = dist in med_res_districts

        # Event: trade_viewed
        events.append((event_counter, sid, "trade_viewed", json.dumps({"trade_id": tid}), c_at.isoformat()))
        event_counter += 1

        # Dialogue simulation (5 turns per session)
        conv_turns = [
            ("learner", "I am interested in this trade, but my parents want to know more."),
            ("parent", "Is this a respectable job? Will he actually earn enough?"),
            ("ai", "I understand your concern. Let's look at verified local data for your area."),
            ("parent", "What if he gets injured, or can't study further?"),
            ("ai", "All centres follow strict safety protocols and this leads to diploma lateral entry.")
        ]

        session_escalated = False

        for t_idx, (speaker, txt) in enumerate(conv_turns):
            m_time = c_at + timedelta(minutes=t_idx * 2)
            messages.append((mid_counter, sid, speaker, txt, lang, m_time.isoformat()))

            # Classify parent turns
            if speaker == "parent":
                if is_high:
                    obj = random.choice(["status", "income", "safety", "degree_pref"])
                    sentiment = round(random.uniform(-0.85, -0.45), 2)
                    intent = "express_concern"
                elif is_med:
                    obj = random.choice(["income", "job_security", "cost"])
                    sentiment = round(random.uniform(-0.35, 0.20), 2)
                    intent = "ask_info"
                else:
                    obj = random.choice(["none", "job_security", "none"])
                    sentiment = round(random.uniform(0.15, 0.75), 2)
                    intent = "express_acceptance"

                message_analyses.append((mid_counter, obj, sentiment, intent))

            mid_counter += 1

        # Check escalation based on district profile
        esc_prob = 0.35 if is_high else (0.15 if is_med else 0.05)
        if random.random() < esc_prob:
            session_escalated = True
            reason = "Persistent parent status concern" if is_high else "Family requested counsellor callback"
            status = random.choice(["queued", "active", "resolved"])
            escalations.append((
                esc_counter, sid, reason,
                f"Family in {dist} has lingering reservations regarding trade progression and societal perception.",
                status, 1 if status != "queued" else None,
                f"98{random.randint(10000000, 99999999)}", "Evening 5-7 PM",
                c_at.isoformat(),
                (c_at + timedelta(hours=2)).isoformat() if status == "resolved" else None,
                "Explained lateral diploma opportunities, parent agreed to visit ITI" if status == "resolved" else None
            ))
            esc_counter += 1
            events.append((event_counter, sid, "escalated", json.dumps({"reason": reason}), (c_at + timedelta(minutes=10)).isoformat()))
            event_counter += 1

        # Event: summary_shared (60% of sessions)
        if random.random() < 0.60:
            events.append((event_counter, sid, "summary_shared", json.dumps({"channel": "whatsapp"}), (c_at + timedelta(minutes=12)).isoformat()))
            event_counter += 1

    # Write sessions.csv
    with open(os.path.join(seed_dir, 'sessions.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "lang", "state", "district", "user_role", "learner_class", "income_bracket", "selected_trade_id", "consent", "created_at"])
        for s in sessions:
            writer.writerow(s)

    # Write messages.csv
    with open(os.path.join(seed_dir, 'messages.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "session_id", "speaker", "text", "lang", "created_at"])
        for m in messages:
            writer.writerow(m)

    # Write message_analysis.csv
    with open(os.path.join(seed_dir, 'message_analysis.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["message_id", "objection_category", "sentiment", "intent"])
        for a in message_analyses:
            writer.writerow(a)

    # Write escalations.csv
    with open(os.path.join(seed_dir, 'escalations.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "session_id", "reason", "summary", "status", "counsellor_id", "callback_phone", "callback_slot", "created_at", "resolved_at", "resolution_note"])
        for e in escalations:
            writer.writerow(e)

    # Write events.csv
    with open(os.path.join(seed_dir, 'events.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "session_id", "type", "meta", "created_at"])
        for ev in events:
            writer.writerow(ev)

    # 8. USERS (3 users)
    # Password 'demo123' bcrypt hash: $2b$12$R.P9f28/oXw2k54G4H6zR.0zY5M/q8p.y.vM6qR5E/jC7v/5pE/gO
    users = [
        (1, "admin@parivarpath.in", "$2b$12$R.P9f28/oXw2k54G4H6zR.0zY5M/q8p.y.vM6qR5E/jC7v/5pE/gO", "admin"),
        (2, "counsellor1@parivarpath.in", "$2b$12$R.P9f28/oXw2k54G4H6zR.0zY5M/q8p.y.vM6qR5E/jC7v/5pE/gO", "counsellor"),
        (3, "counsellor2@parivarpath.in", "$2b$12$R.P9f28/oXw2k54G4H6zR.0zY5M/q8p.y.vM6qR5E/jC7v/5pE/gO", "counsellor"),
    ]
    with open(os.path.join(seed_dir, 'users.csv'), 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["id", "email", "password_hash", "role"])
        for u in users:
            writer.writerow(u)

    print(f"Successfully generated all 12 seed CSV files in {seed_dir}!")

if __name__ == "__main__":
    main()
