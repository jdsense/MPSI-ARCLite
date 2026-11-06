// src/lib/auth-crypto.ts
// 비밀번호 보안 정책 및 단방향 암호화 해싱 유틸

// 비밀번호 정책 검증 (영문 + 숫자 + 특수문자 조합 최소 8자리 이상)
export function validatePasswordPolicy(password: string): { isValid: boolean; message: string } {
  if (!password) {
    return { isValid: false, message: "비밀번호를 입력해주세요." };
  }
  if (password.length < 8) {
    return { isValid: false, message: "비밀번호는 최소 8자 이상이어야 합니다." };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  if (!hasLetter) {
    return { isValid: false, message: "비밀번호에 영문이 1자 이상 포함되어야 합니다." };
  }
  if (!hasNumber) {
    return { isValid: false, message: "비밀번호에 숫자가 1자 이상 포함되어야 합니다." };
  }
  if (!hasSpecial) {
    return { isValid: false, message: "비밀번호에 특수문자(!@#$%^&* 등)가 1자 이상 포함되어야 합니다." };
  }

  return { isValid: true, message: "안전한 비밀번호입니다." };
}

// 초기 기본 계정 표준 비밀번호
export const DEFAULT_INITIAL_PASSWORD = "Mpsi2026!@";
// "Mpsi2026!@"의 SHA-256 해시값
export const DEFAULT_INITIAL_PASSWORD_HASH = "477f4a2c6f3ee0d41a95d634db02b62408ad17ada402c9e88b8cfd5cc2160e81";

// SHA-256 단방향 암호화 함수 (Web Crypto API 및 Node.js Crypto 대응)
export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    console.error("crypto.subtle failed, fallbacking", e);
  }

  // Node.js 환경 또는 Web Crypto 미지원 시 순수 JS 해시
  return sha256Pure(password);
}

// 비밀번호 일치 여부 검증
export async function verifyPassword(plainPassword: string, hashedPassword?: string): Promise<boolean> {
  if (!hashedPassword) return false;
  const hashOfInput = await hashPassword(plainPassword);
  return hashOfInput.toLowerCase() === hashedPassword.toLowerCase();
}

// 타입 안전한 순수 JS SHA-256 구현
function sha256Pure(str: string): string {
  function r(n: number, s: number) {
    return (n >>> s) | (n << (32 - s));
  }

  const h: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }
  for (let i = 7; i >= 0; i--) {
    utf8.push((bitLength >>> (i * 8)) & 0xff);
  }

  const words: number[] = [];
  for (let i = 0; i < utf8.length; i += 4) {
    words.push((utf8[i] << 24) | (utf8[i + 1] << 16) | (utf8[i + 2] << 8) | utf8[i + 3]);
  }

  const w: number[] = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[i + t];
    for (let t = 16; t < 64; t++) {
      const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], curH = h[7];

    for (let t = 0; t < 64; t++) {
      const s1 = r(e, 6) ^ r(e, 11) ^ r(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (curH + s1 + ch + k[t] + w[t]) | 0;
      const s0 = r(a, 2) ^ r(a, 13) ^ r(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      curH = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + curH) | 0;
  }

  return h.map((val) => (val >>> 0).toString(16).padStart(8, "0")).join("");
}
