#!/usr/bin/env python3
"""Reproduce the 10 independently authored GMWW sea icons (Wave 5) without cutting a sprite."""
import base64, brotli, cairosvg, hashlib, json, pathlib, re, shutil, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[2]
ASSET=ROOT/"assets/action-icons/sea-v1"
LOCAL=ROOT/"server-game/current/action-icons/sea-v1"
SOURCE=ASSET/"wave5-sources.b64"
EXPECTED="ab67d2f5f771785943c5898cbc75bd6450aad89ada2c819fd0b1a06ce281f3c0"
DEFINITIONS=[
("40_phieu_con_qua","phieu-con-qua","Phiếu Con Quạ","character",["action-g7-crow-votes"]),
("41_can_chuyen_hoa","can-chuyen-hoa","Cắn Chuyển Hóa","character",["action-demon-wolf-convert"]),
("42_chon_hinh_tuong","chon-hinh-tuong","Chọn Hình Tượng","character",["action-wild-child-idol"]),
("43_xem_artifact","xem-artifact","Xem Artifact","character",["artifact_action_view"]),
("44_doi_artifact","doi-artifact","Đổi Artifact","character",["artifact_action_exchange"]),
("45_cong_khai_vai","cong-khai-vai","Công Khai Vai Trò","none",["artifact_action_reveal_role"]),
("46_sao_chep_chuc_nang","sao-chep-chuc-nang","Sao Chép Chức Năng","character",["artifact_action_copy_function"]),
("47_huy_artifact","huy-artifact","Hủy Artifact","character",["artifact_action_destroy"]),
("48_buoc_quay_mat","buoc-quay-mat","Buộc Quay Mặt","character",["artifact_action_turn_away"]),
("49_sang_tao_artifact","sang-tao-artifact","Sáng Tạo Artifact","none",["artifact_action_custom"])
]
def sha(b):return hashlib.sha256(b).hexdigest()
raw=brotli.decompress(base64.b64decode(SOURCE.read_text().strip()))
assert sha(raw)==EXPECTED, "Source art digest mismatch"
files=json.loads(raw)
assert len(files)==10
ASSET.mkdir(parents=True,exist_ok=True);LOCAL.mkdir(parents=True,exist_ok=True)
manifest_path=ASSET/"manifest.json"
manifest=json.loads(manifest_path.read_text())
previous=[entry for entry in manifest["icons"] if not entry["png"].startswith(tuple(f"{i}_" for i in range(40,50)))]
assert len(previous)==39, ("Unexpected baseline inventory",len(previous))
for base,id,name,target,actions in DEFINITIONS:
    svg_name=base+".svg";png_name=base+".png"
    svg_content=files[svg_name]
    ET.fromstring(svg_content)
    svg_bytes=svg_content.encode()
    svg_file=ASSET/svg_name;png_file=ASSET/png_name
    svg_file.write_bytes(svg_bytes)
    cairosvg.svg2png(bytestring=svg_bytes,write_to=str(png_file),output_width=1024,output_height=1024)
    png_bytes=png_file.read_bytes()
    assert png_bytes.startswith(b"\x89PNG\r\n\x1a\n")
    assert int.from_bytes(png_bytes[16:20],"big")==1024
    assert int.from_bytes(png_bytes[20:24],"big")==1024
    assert png_bytes[25]==6, "Image must retain RGBA alpha"
    shutil.copyfile(png_file,LOCAL/png_name)
    previous.append({"id":id,"name":name,"target":target,"actions":actions,"png":png_name,"svg":svg_name,
      "sha256_png":sha(png_bytes),"sha256_svg":sha(svg_bytes),"size":{"width":1024,"height":1024},"transparent":True})
manifest.update({"version":"v1-wave5","status":"source-art-and-actions-mapped","count":len(previous),
    "source":"39 prior originals + 10 independently drawn wave5 SVG 2026-10-25","icons":previous})
assert manifest["count"]==49
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
print(f"Generated exactly 10 new individual PNG/SVG pairs; manifest={manifest['count']} assets; digest={EXPECTED}")
