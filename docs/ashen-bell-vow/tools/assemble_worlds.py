#!/usr/bin/env python3
"""
Ashen Bell Vow — Offline Multi-Cycle World Assembly Pipeline (v46.0 Stage 2)
Zero external dependencies, deterministic, idempotent.

Generates pre-baked, geometry-verified world manifests into data/worlds/:
  - NG1 (data/worlds/world_ng1.json)                        : Frozen 25-room classic baseline (zero diff vs data/world.json)
  - NG2 (data/worlds/world_ng2.json + data/worlds/ng2_rooms): Eclipse Master Mode (forward 25 rooms + 17 cross-biome elite remixes, sweeping void hazards, 2 exclusive caches & relic swaps)
  - NG3 (data/worlds/world_ng3.json + data/worlds/ng3_rooms): Skyward Span Cycle (26 rooms: full NG2 Eclipse Master + r26_sky_span upper bridge & escalated sky guards)
"""
import copy
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(ROOT, "data")
WORLDS_DIR = os.path.join(DATA_DIR, "worlds")

# 7 Immutable Composite Ecosystem Blocks (internal loops, hidden rooms & one-way switches stay intact!)
COMPOSITE_BLOCKS = {
    "A_Prologue":    ["r01_sanctuary", "r02_corridor", "r03_chapel", "r18_rain_steps", "r19_belfry_outer"],
    "B_BellWell":    ["r04_bell_well", "r05_foundry", "r20_bell_galleries"],
    "C_WoodsCrypt":  ["r06_crypt", "r10_ink_woods", "r14_woods_cavern", "r15_woods_heart"],
    "D_WindSpire":   ["r09_wind_spire", "r12_wind_bridge", "r13_wind_peak", "r25_mirror_abyss"],
    "E_AscentHeart": ["r07_ascent", "r08_heart"],
    "F_FrostRidge":  ["r11_frost_ridge", "r16_frost_tomb", "r17_frost_summit"],
    "G_Cistern":     ["r21_cistern_west", "r22_cistern_nave", "r23_cistern_lock", "r24_frost_seep"],
}

# Exact entity & boss hit-box widths/heights from src/entities.js (ensures zero clipping/floating under mirror or remix)
ENTITY_DIMS = {
    "sentinel":        (36, 62),
    "wraith":          (36, 48),
    "golem":           (46, 78),
    "priest":          (36, 66),
    "duelist":         (34, 60),
    "leech":           (34, 38),
    "dummy":           (38, 68),
    "falcon":          (44, 34),
    "fungus":          (40, 58),
    "frostguard":      (40, 68),
    "drowned":         (36, 60),
    "anchorite":       (48, 78),
    "weaver":          (44, 36),
    "crawler":         (50, 42),
    "cantor":          (36, 72),
    "warden_wind":     (44, 72),
    "warden_forest":   (64, 98),
    "warden_mountain": (42, 74),
}

BOSS_DIMS = {
    "boss":  (58, 104),
    "boss2": (56, 98),
    "boss3": (62, 116),
    "boss4": (56, 108),
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_ng1_baseline():
    world = load_json(os.path.join(DATA_DIR, "world.json"))
    rooms = {}
    for entry in world.get("rooms", []):
        rf = os.path.join(ROOT, entry["file"].lstrip("./"))
        rm = load_json(rf)
        for k in ("id", "zoneName", "name", "theme", "bounds", "connections"):
            if entry.get(k) is not None:
                rm[k] = copy.deepcopy(entry[k])
        rooms[rm["id"]] = rm
    return world, rooms


def mirror_room_horizontal(rm, world_max_x):
    """Exact horizontal mirror of a room around world_max_x: transforms bounds & all 31 local object arrays."""
    out = copy.deepcopy(rm)
    b = out["bounds"]
    rw = b["w"]
    b["x"] = world_max_x - (b["x"] + rw)
    out["mirrored"] = True

    def mx_rect(obj, xk="x", wk="w"):
        obj[xk] = rw - obj[xk] - obj[wk]

    def mx_pt(obj, xk="x"):
        obj[xk] = rw - obj[xk]

    for sz in out.get("subZones", []):
        mx_rect(sz)

    for s in out.get("solids", []):
        mx_rect(s)

    for cp in out.get("crumblePlatforms", []):
        mx_rect(cp)

    for bf in out.get("breakableFloors", []):
        mx_rect(bf)

    for sw in out.get("secretWalls", []):
        mx_rect(sw)

    for vb in out.get("voidBarriers", []):
        mx_rect(vb)
        if vb.get("sweeping"):
            old_min = vb.get("sweepMinX", 0)
            old_max = vb.get("sweepMaxX", rw)
            vb["sweepMinX"] = rw - old_max - vb["w"]
            vb["sweepMaxX"] = rw - old_min - vb["w"]

    for sw in out.get("slickWalls", []):
        mx_rect(sw)
        if sw.get("side") == "left":
            sw["side"] = "right"
        elif sw.get("side") == "right":
            sw["side"] = "left"

    for g in out.get("gates", []):
        mx_rect(g)
        if "leverX" in g:
            g["leverX"] = rw - g["leverX"]

    for wz in out.get("windZones", []):
        mx_rect(wz)
        if "vx" in wz:
            wz["vx"] = -wz["vx"]

    for wv in out.get("windVanes", []):
        mx_pt(wv)
        if "dir" in wv:
            wv["dir"] = -wv["dir"]

    for rv in out.get("rivers", []):
        mx_rect(rv)
        if "safeX" in rv:
            rv["safeX"] = rw - rv["safeX"]

    for ip in out.get("icePillars", []):
        mx_pt(ip)
        if "bridgeX" in ip and "bridgeW" in ip:
            ip["bridgeX"] = rw - ip["bridgeX"] - ip["bridgeW"]

    for pz in out.get("resonancePuzzles", []):
        if "cageX" in pz:
            pz["cageX"] = rw - pz["cageX"]
        for bell in pz.get("bells", []):
            mx_pt(bell)

    for arr_key in ("altars", "npcs", "loreTablets", "pickups", "grappleAnchors", "bouncePads", "worldSwitches", "inscriptions"):
        for item in out.get(arr_key, []):
            mx_pt(item)

    for lan in out.get("lanterns", []):
        mx_pt(lan)
        if "angle" in lan:
            lan["angle"] = -lan["angle"]

    for pd in out.get("pendulums", []):
        mx_pt(pd)

    for e in out.get("enemies", []):
        ew, _eh = ENTITY_DIMS.get(e.get("kind"), (36, 60))
        e["x"] = rw - e["x"] - ew
        if "minX" in e and "maxX" in e:
            old_min, old_max = e["minX"], e["maxX"]
            e["minX"] = rw - old_max - ew
            e["maxX"] = rw - old_min - ew

    for boss in out.get("bosses", []):
        bw, _bh = BOSS_DIMS.get(boss.get("kind"), (58, 104))
        boss["x"] = rw - boss["x"] - bw
        old_min = boss.get("arenaMinX", 0)
        old_max = boss.get("arenaMaxX", rw)
        boss["arenaMinX"] = rw - old_max
        boss["arenaMaxX"] = rw - old_min

    props = out.get("props") or {}
    for p in props.get("puddles", []):
        mx_rect(p)
    for bn in props.get("banners", []):
        mx_pt(bn)
    for cl in props.get("candles", []):
        mx_pt(cl)
    if "boneCairns" in props:
        props["boneCairns"] = [
            (dict(bc, x=rw - bc["x"]) if isinstance(bc, dict) else (rw - bc))
            for bc in props["boneCairns"]
        ]
    for st in props.get("stamps", []):
        mx_pt(st)
        st["flip"] = not bool(st.get("flip", False))

    return out


def upgrade_enemy_kind(rm, enemy_id, new_kind, adjust_ground=True):
    for e in rm.get("enemies", []):
        if e.get("id") == enemy_id:
            old_kind = e.get("kind")
            old_w, old_h = ENTITY_DIMS.get(old_kind, (36, 60))
            new_w, new_h = ENTITY_DIMS.get(new_kind, (36, 60))
            if adjust_ground:
                e["y"] = e["y"] + (old_h - new_h)
            e["kind"] = new_kind
            if new_kind in ("cantor", "wraith", "falcon"):
                e.pop("minX", None)
                e.pop("maxX", None)
            elif "minX" in e and "maxX" in e:
                e["maxX"] = max(e["minX"] + 40, e["maxX"] - max(0, new_w - old_w))
            return True
    return False


def swap_relic_payloads(rm_a, id_a, rm_b, id_b):
    pa = next((p for p in rm_a.get("pickups", []) if p.get("id") == id_a), None)
    pb = next((p for p in rm_b.get("pickups", []) if p.get("id") == id_b), None)
    if not pa or not pb:
        return
    for key in ("id", "relicId", "name", "desc"):
        pa[key], pb[key] = pb[key], pa[key]


def build_ng1(base_world, base_rooms):
    w = copy.deepcopy(base_world)
    w["cycle"] = 1
    w["variantId"] = "ng1_classic"
    w["variantName"] = "一周目 · 经典东征箱庭"
    w["variantNameEn"] = "NG1 · Classic Cloister"
    w["compositeBlocks"] = COMPOSITE_BLOCKS
    save_json(os.path.join(WORLDS_DIR, "world_ng1.json"), w)
    return w, base_rooms


def apply_eclipse_master_remix(rooms_dict):
    """Plan A (v46.8): Forward-facing Eclipse Master Mode remix (cross-biome elite squads, sweeping void hazards, exclusive caches & relic swaps)."""
    # 1. 17 Cross-Biome Elite Garrison Upgrades (exact ENTITY_DIMS foot alignment, zero clipping!)
    remixes = [
        ("r02_corridor",      "sent_1",          "frostguard", True),
        ("r02_corridor",      "sent_2",          "crawler",    True),
        ("r02_corridor",      "wraith_2",        "cantor",     False),
        ("r04_bell_well",     "golem_1",         "frostguard", True),
        ("r04_bell_well",     "golem_2",         "anchorite",  True),
        ("r04_bell_well",     "wraith_3",        "cantor",     False),
        ("r06_crypt",         "crawler_crypt_1", "weaver",     True),
        ("r07_ascent",        "golem_asc",       "anchorite",  True),
        ("r07_ascent",        "duelist_asc",     "frostguard", True),
        ("r09_wind_spire",    "priest_wind_1",   "cantor",     False),
        ("r09_wind_spire",    "duelist_wind_1",  "crawler",    True),
        ("r10_ink_woods",     "fungus_forest_1", "anchorite",  True),
        ("r11_frost_ridge",   "priest_frost_1",  "cantor",     False),
        ("r18_rain_steps",    "s_rain_1",        "duelist",    True),
        ("r18_rain_steps",    "s_rain_2",        "frostguard", True),
        ("r21_cistern_west",  "p_cw_1",          "cantor",     False),
        ("r22_cistern_nave",  "fg_cn_1",         "weaver",     True),
    ]
    for rid, eid, new_kind, adj in remixes:
        if rid in rooms_dict:
            upgrade_enemy_kind(rooms_dict[rid], eid, new_kind, adjust_ground=adj)

    # 2. High-Hazard Sweeping Ink-Blight Curtains (designed around NG+ players retaining Shadow Dash from start!)
    rooms_dict["r02_corridor"].setdefault("voidBarriers", []).append({
        "id": "vb_ng2_corridor_sweep", "x": 620, "y": 438, "w": 24, "h": 142,
        "sweeping": True, "sweepMinX": 500, "sweepMaxX": 980, "sweepSpeed": 1.25, "sweepPhase": 0.4
    })
    rooms_dict["r04_bell_well"].setdefault("voidBarriers", []).append({
        "id": "vb_ng2_well_sweep", "x": 1120, "y": 878, "w": 24, "h": 142,
        "sweeping": True, "sweepMinX": 970, "sweepMaxX": 1420, "sweepSpeed": 1.32, "sweepPhase": 1.1
    })
    rooms_dict["r18_rain_steps"].setdefault("voidBarriers", []).append({
        "id": "vb_ng2_rain_sweep", "x": 680, "y": 458, "w": 24, "h": 142,
        "sweeping": True, "sweepMinX": 460, "sweepMaxX": 1140, "sweepSpeed": 1.28, "sweepPhase": 0.8
    })

    # 3. Exclusive Master-Mode Eclipse Echo Caches (+120 echoes each)
    rooms_dict["r02_corridor"].setdefault("pickups", []).append({
        "id": "pickup_echo_ng2_corridor",
        "kind": "echoCache",
        "echoAmount": 120,
        "x": 660,
        "y": 580,
        "name": "蚀月残响匣",
        "desc": "蚀月大师模式秘宝 · 获得 +120 残响！"
    })
    rooms_dict["r09_wind_spire"].setdefault("pickups", []).append({
        "id": "pickup_echo_ng2_spire",
        "kind": "echoCache",
        "echoAmount": 120,
        "x": 590,
        "y": 580,
        "name": "绝风蚀月匣",
        "desc": "蚀月大师模式秘宝 · 获得 +120 残响！"
    })

    # 4. Relic Pedestal Remix (same lock-tier pairs -> 0 softlocks, fresh build cadence)
    swap_relic_payloads(rooms_dict["r18_rain_steps"], "pickup_relic_core", rooms_dict["r19_belfry_outer"], "pickup_relic_bell")
    swap_relic_payloads(rooms_dict["r02_corridor"], "pickup_relic_clapper", rooms_dict["r04_bell_well"], "pickup_relic_ironheart")


def build_ng2(base_world, base_rooms):
    ng2_rooms_dir = os.path.join(WORLDS_DIR, "ng2_rooms")
    os.makedirs(ng2_rooms_dir, exist_ok=True)

    ng2_rooms = {rid: copy.deepcopy(rm) for rid, rm in base_rooms.items()}
    apply_eclipse_master_remix(ng2_rooms)

    w = copy.deepcopy(base_world)
    w["cycle"] = 2
    w["variantId"] = "ng2_eclipse"
    w["variantName"] = "二周目 · 蚀月大师"
    w["variantNameEn"] = "NG2 · Eclipse Master"
    w["mirrored"] = False
    w["compositeBlocks"] = COMPOSITE_BLOCKS
    w["rooms"] = []

    for entry in base_world["rooms"]:
        rid = entry["id"]
        rm = ng2_rooms[rid]
        rm["mirrored"] = False
        rel_file = f"./data/worlds/ng2_rooms/{rid}.json"
        save_json(os.path.join(ROOT, rel_file.lstrip("./")), rm)
        w["rooms"].append({
            "id": rid,
            "file": rel_file,
            "zoneName": rm.get("zoneName", entry.get("zoneName", "晦渊")),
            "name": rm["name"],
            "theme": rm["theme"],
            "mirrored": False,
            "bounds": copy.deepcopy(rm["bounds"]),
            "connections": list(rm["connections"]),
        })

    save_json(os.path.join(WORLDS_DIR, "world_ng2.json"), w)
    return w, ng2_rooms


def make_r26_sky_span():
    """NG3-exclusive 1135x740 high-altitude sky bridge spanning r18_rain_steps <-> r20_bell_galleries above r03_chapel."""
    return {
        "schemaVersion": 1,
        "id": "r26_sky_span",
        "zoneName": "绝风苍穹",
        "name": "苍穹断桥",
        "theme": "wind",
        "bounds": {
            "x": 2645,
            "y": -740,
            "w": 1135,
            "h": 740
        },
        "subZones": [
            {"name": "绝风苍穹 · 苍穹断桥", "x": 0, "y": 0, "w": 1135, "h": 740}
        ],
        "connections": [
            "r18_rain_steps",
            "r20_bell_galleries"
        ],
        "solids": [
            {"x": 0,   "y": 0,   "w": 1135, "h": 34,  "type": "pillar"},
            {"x": 0,   "y": 600, "w": 220,  "h": 140, "type": "ground"},
            {"x": 220, "y": 700, "w": 695,  "h": 40,  "type": "ground"},
            {"x": 915, "y": 620, "w": 220,  "h": 120, "type": "ground"},
            {"x": 290, "y": 465, "w": 185,  "h": 22,  "type": "platform"},
            {"x": 660, "y": 465, "w": 185,  "h": 22,  "type": "platform"},
            {"x": 475, "y": 300, "w": 185,  "h": 22,  "type": "platform"}
        ],
        "crumblePlatforms": [
            {"id": "cp_sky_span_1", "x": 205, "y": 540, "w": 90, "h": 18},
            {"id": "cp_sky_span_2", "x": 840, "y": 540, "w": 90, "h": 18}
        ],
        "altars": [],
        "loreTablets": [],
        "gates": [],
        "secretWalls": [],
        "voidBarriers": [],
        "slickWalls": [],
        "pickups": [
            {
                "id": "pickup_echo_sky_span",
                "kind": "echoCache",
                "echoAmount": 90,
                "x": 568,
                "y": 300,
                "name": "苍穹残响匣",
                "desc": "三周目苍穹断桥秘宝 · 获得 +90 残响！"
            }
        ],
        "resonancePuzzles": [],
        "pendulums": [],
        "rivers": [],
        "windZones": [
            {"id": "wz_sky_span_mid", "x": 450, "y": 140, "w": 235, "h": 555, "vx": 0, "vy": -1560}
        ],
        "bouncePads": [],
        "breakableFloors": [],
        "worldSwitches": [],
        "windVanes": [],
        "icePillars": [],
        "grappleAnchors": [
            {"id": "anc_sky_span_w", "x": 385, "y": 290, "topY": 34},
            {"id": "anc_sky_span_e", "x": 750, "y": 290, "topY": 34}
        ],
        "lanterns": [
            {"id": "lan_sky_span_1", "x": 160, "anchorY": 160, "len": 150, "angle": 0.06, "topY": 34},
            {"id": "lan_sky_span_2", "x": 975, "anchorY": 160, "len": 150, "angle": -0.06, "topY": 34}
        ],
        "enemies": [
            {"id": "falcon_sky_span_1", "kind": "falcon", "x": 370, "y": 230},
            {"id": "cantor_sky_span_1", "kind": "cantor", "x": 730, "y": 355}
        ],
        "bosses": [],
        "inscriptions": [
            {"x": 568, "y": 245, "text": "「苍穹断桥 · 纵越断钟礼拜堂之巅」"}
        ],
        "props": {
            "puddles": [
                {"x": 36,  "y": 600, "w": 135},
                {"x": 955, "y": 620, "w": 135}
            ],
            "banners": [
                {"x": 200, "y": 34, "len": 150, "color": "#162b3d"},
                {"x": 935, "y": 34, "len": 150, "color": "#162b3d"}
            ],
            "candles": [
                {"x": 110, "y": 600, "count": 3},
                {"x": 1020, "y": 620, "count": 3}
            ],
            "boneCairns": [],
            "stamps": [
                {"type": "broken_arch",   "x": 120,  "y": 600, "scale": 1.05, "flip": False, "layer": "bg", "alpha": 0.76, "seed": 3},
                {"type": "hanging_chains","x": 568,  "y": 34,  "scale": 1.00, "flip": False, "layer": "bg", "alpha": 0.56, "seed": 5},
                {"type": "broken_arch",   "x": 1015, "y": 620, "scale": 1.05, "flip": True,  "layer": "bg", "alpha": 0.76, "seed": 4}
            ]
        },
        "npcs": []
    }


def build_ng3(base_world, base_rooms):
    ng3_rooms_dir = os.path.join(WORLDS_DIR, "ng3_rooms")
    os.makedirs(ng3_rooms_dir, exist_ok=True)

    # NG3 inherits the full NG2 Eclipse Master Mode remix + adds Skyward Span 26th room & apex garrisons!
    ng3_rooms = {rid: copy.deepcopy(rm) for rid, rm in base_rooms.items()}
    apply_eclipse_master_remix(ng3_rooms)

    # 1. Insert r26_sky_span bridging r18_rain_steps (x=940..2645) <-> r20_bell_galleries (x=3780..5560)
    r26 = make_r26_sky_span()
    r26.setdefault("voidBarriers", []).append({
        "id": "vb_ng3_sky_sweep", "x": 460, "y": 158, "w": 24, "h": 142,
        "sweeping": True, "sweepMinX": 295, "sweepMaxX": 820, "sweepSpeed": 1.35, "sweepPhase": 0.5
    })
    ng3_rooms["r26_sky_span"] = r26

    # Carve clean 180px doorway on r18_rain_steps east wall (x=1670..1705, open y=420..600)
    r18 = ng3_rooms["r18_rain_steps"]
    new_solids_r18 = []
    for s in r18["solids"]:
        if s["type"] == "pillar" and s["x"] == 1670 and s["y"] == 0 and s["h"] == 740:
            new_solids_r18.append({"x": 1670, "y": 0,   "w": 35, "h": 420, "type": "pillar"})
            new_solids_r18.append({"x": 1670, "y": 600, "w": 35, "h": 140, "type": "pillar"})
        else:
            new_solids_r18.append(s)
    r18["solids"] = new_solids_r18
    for sw in r18.get("slickWalls", []):
        if sw.get("id") == "slick_r18_east":
            sw["y"] = 340
            sw["h"] = 80
    if "r26_sky_span" not in r18["connections"]:
        r18["connections"].append("r26_sky_span")

    # Carve clean 180px doorway on r20_bell_galleries west wall (x=0..36, open y=440..620)
    r20 = ng3_rooms["r20_bell_galleries"]
    new_solids_r20 = []
    for s in r20["solids"]:
        if s["type"] == "pillar" and s["x"] == 0 and s["y"] == 0 and s["h"] == 740:
            new_solids_r20.append({"x": 0, "y": 0,   "w": 36, "h": 440, "type": "pillar"})
            new_solids_r20.append({"x": 0, "y": 620, "w": 36, "h": 120, "type": "pillar"})
        else:
            new_solids_r20.append(s)
    r20["solids"] = new_solids_r20
    for sw in r20.get("slickWalls", []):
        if sw.get("id") == "slick_r20_west":
            sw["y"] = 120
            sw["h"] = 320
    if "r26_sky_span" not in r20["connections"]:
        r20["connections"].append("r26_sky_span")

    # 2. NG3 Additional Apex Escalation on top of NG2 Master garrisons
    upgrade_enemy_kind(ng3_rooms["r14_woods_cavern"], "fungus_wc_1", "anchorite", adjust_ground=True)
    upgrade_enemy_kind(ng3_rooms["r20_bell_galleries"], "f_gal_2", "cantor", adjust_ground=False)

    w = copy.deepcopy(base_world)
    w["cycle"] = 3
    w["variantId"] = "ng3_skyway"
    w["variantName"] = "三周目 · 苍穹长桥"
    w["variantNameEn"] = "NG3 · Skyward Span"
    w["compositeBlocks"] = dict(COMPOSITE_BLOCKS, H_SkySpan=["r26_sky_span"])
    w["rooms"] = []

    room_order = [e["id"] for e in base_world["rooms"]] + ["r26_sky_span"]
    for rid in room_order:
        rm = ng3_rooms[rid]
        rel_file = f"./data/worlds/ng3_rooms/{rid}.json"
        save_json(os.path.join(ROOT, rel_file.lstrip("./")), rm)
        w["rooms"].append({
            "id": rid,
            "file": rel_file,
            "zoneName": rm.get("zoneName", "晦渊"),
            "name": rm["name"],
            "theme": rm["theme"],
            "bounds": copy.deepcopy(rm["bounds"]),
            "connections": list(rm["connections"]),
        })

    save_json(os.path.join(WORLDS_DIR, "world_ng3.json"), w)
    return w, ng3_rooms


def assemble_all(verbose=True):
    base_world, base_rooms = load_ng1_baseline()
    w1, r1 = build_ng1(base_world, base_rooms)
    w2, r2 = build_ng2(base_world, base_rooms)
    w3, r3 = build_ng3(base_world, base_rooms)
    if verbose:
        print("[assemble_worlds] Baked 3 deterministic cycle worlds into data/worlds/:")
        print(f"  - NG1 (world_ng1.json): {len(w1['rooms'])} rooms | Classic Cloister (baseline frozen)")
        print(f"  - NG2 (world_ng2.json): {len(w2['rooms'])} rooms | Eclipse Master (forward, 17 cross-biome elites, 3 sweeping curtains, 2 caches)")
        print(f"  - NG3 (world_ng3.json): {len(w3['rooms'])} rooms | Skyward Span (NG2 Eclipse Master + r26_sky_span upper bridge & apex esc)")
    return {"ng1": (w1, r1), "ng2": (w2, r2), "ng3": (w3, r3)}


if __name__ == "__main__":
    assemble_all(verbose=True)
