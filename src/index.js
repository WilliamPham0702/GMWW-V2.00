// Điểm vào của Cloudflare Worker GMWW. File này chỉ giữ hằng số phiên bản/cấu hình
// (công cụ phát hành đọc tại đây) và ghép các phần trong src/worker/ — xem src/worker/README.md.
import { defineWorkerConfig } from "./worker/config.js";

const PROJECT="GMWW-V2.00",VERSION="V3.321",NATIVE_SHELL_VERSION="3.264",UPDATE_CHANNEL_REV="runtime-3321-chat-box-center",ROOM_IDLE_TTL=72*60*60*1000,ROOM_RESULT_REOPEN_DELAY=10000,ROOM_DIRECTORY_LEASE=180*1000,ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",ROOM_CODE_LENGTH=6;
const LOGIN_RE=/^[A-Za-z0-9._]{4,20}$/,SESSION_TTL=30*24*60*60*1000,PBKDF2_ITERATIONS=100000,MEMBER_STORE_NAME="__GMWW_MEMBERS__",PRESENCE_TTL=90000;
const GM_SYNC_TOKEN="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
const GM_PRESENCE_TTL=75000;
defineWorkerConfig({ PROJECT, VERSION, NATIVE_SHELL_VERSION, UPDATE_CHANNEL_REV, ROOM_IDLE_TTL, ROOM_RESULT_REOPEN_DELAY, ROOM_DIRECTORY_LEASE, ROOM_ALPHABET, ROOM_CODE_LENGTH, LOGIN_RE, SESSION_TTL, PBKDF2_ITERATIONS, MEMBER_STORE_NAME, PRESENCE_TTL, GM_SYNC_TOKEN, GM_PRESENCE_TTL });

export { RoomDurableObject } from "./worker/room/room-durable-object.js";
export { default } from "./worker/http/router.js";
