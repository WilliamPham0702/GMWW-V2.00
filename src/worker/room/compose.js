// Ghép các nhóm phương thức vào lớp Durable Object của phòng.
// Mỗi nhóm là một class chỉ chứa phương thức. Phương thức được gắn vào prototype của lớp đích
// với đúng descriptor gốc (không enumerable), nên lớp sau khi ghép giống hệt một class viết liền.
export function installRoomMethods(target, groups) {
  for (const group of groups) {
    for (const key of Reflect.ownKeys(group.prototype)) {
      if (key === "constructor") continue;
      if (Object.prototype.hasOwnProperty.call(target.prototype, key)) throw new Error("Trùng tên phương thức phòng: " + String(key));
      Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(group.prototype, key));
    }
  }
  return target;
}
