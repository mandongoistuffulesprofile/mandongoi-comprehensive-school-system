const GSM7_BASIC: Record<string, string> = {
  '@': '\x00', '£': '\x01', '$': '\x02', '¥': '\x03', 'è': '\x04', 'é': '\x05',
  'ù': '\x06', 'ì': '\x07', 'ò': '\x08', 'Ç': '\x09', '\n': '\x0a', 'Ø': '\x0b',
  'ø': '\x0c', '\r': '\x0d', 'Å': '\x0e', 'å': '\x0f',
  'Δ': '\x10', '_': '\x11', 'Φ': '\x12', 'Γ': '\x13', 'Λ': '\x14', 'Ω': '\x15',
  'Π': '\x16', 'Ψ': '\x17', 'Σ': '\x18', 'Θ': '\x19', 'Ξ': '\x1a', '\x1b': '\x1b',
  'Æ': '\x1c', 'æ': '\x1d', 'ß': '\x1e', 'É': '\x1f',
  ' ': '\x20', '!': '\x21', '"': '\x22', '#': '\x23', '¤': '\x24', '%': '\x25',
  '&': '\x26', '\'': '\x27', '(': '\x28', ')': '\x29', '*': '\x2a', '+': '\x2b',
  ',': '\x2c', '-': '\x2d', '.': '\x2e', '/': '\x2f',
  '0': '\x30', '1': '\x31', '2': '\x32', '3': '\x33', '4': '\x34',
  '5': '\x35', '6': '\x36', '7': '\x37', '8': '\x38', '9': '\x39',
  ':': '\x3a', ';': '\x3b', '<': '\x3c', '=': '\x3d', '>': '\x3e', '?': '\x3f',
  '¡': '\x40', 'A': '\x41', 'B': '\x42', 'C': '\x43', 'D': '\x44',
  'E': '\x45', 'F': '\x46', 'G': '\x47', 'H': '\x48', 'I': '\x49',
  'J': '\x4a', 'K': '\x4b', 'L': '\x4c', 'M': '\x4d', 'N': '\x4e', 'O': '\x4f',
  'P': '\x50', 'Q': '\x51', 'R': '\x52', 'S': '\x53', 'T': '\x54',
  'U': '\x55', 'V': '\x56', 'W': '\x57', 'X': '\x58', 'Y': '\x59', 'Z': '\x5a',
  'Ä': '\x5b', 'Ö': '\x5c', 'Ñ': '\x5d', 'Ü': '\x5e', '§': '\x5f',
  '¿': '\x60', 'a': '\x61', 'b': '\x62', 'c': '\x63', 'd': '\x64',
  'e': '\x65', 'f': '\x66', 'g': '\x67', 'h': '\x68', 'i': '\x69',
  'j': '\x6a', 'k': '\x6b', 'l': '\x6c', 'm': '\x6d', 'n': '\x6e', 'o': '\x6f',
  'p': '\x70', 'q': '\x71', 'r': '\x72', 's': '\x73', 't': '\x74',
  'u': '\x75', 'v': '\x76', 'w': '\x77', 'x': '\x78', 'y': '\x79', 'z': '\x7a',
  'ä': '\x7b', 'ö': '\x7c', 'ñ': '\x7d', 'ü': '\x7e', 'à': '\x7f',
};

const GSM7_EXTENSION: Record<string, string> = {
  '\n': '\x0a',  // LF (form feed in extension table ambiguous; keep basic)
  '^': '\x14',   // real: 1B 14
  '{': '\x28',   // 1B 28
  '}': '\x29',   // 1B 29
  '\\': '\x2f',  // 1B 2F
  '[': '\x3c',   // 1B 3C
  '~': '\x3d',   // 1B 3D
  ']': '\x3e',   // 1B 3E
  '|': '\x40',   // 1B 40
  '€': '\x65',   // 1B 65
};

const EXTENSION_CHARS = new Set(Object.keys(GSM7_EXTENSION));

function isGSM7Char(char: string): boolean {
  return char in GSM7_BASIC || char in GSM7_EXTENSION;
}

export function isGSM7(text: string): boolean {
  for (const char of text) {
    if (!isGSM7Char(char)) return false;
  }
  return true;
}

export function encodeGSM7(text: string): string {
  let encoded = '';
  for (const char of text) {
    if (char in GSM7_BASIC) {
      encoded += GSM7_BASIC[char];
    } else if (char in GSM7_EXTENSION) {
      encoded += '\x1b' + GSM7_EXTENSION[char];
    } else {
      const ascii = char.charCodeAt(0);
      if (ascii <= 0x7f) {
        encoded += char;
      } else {
        encoded += '?';
      }
    }
  }
  return encoded;
}

export function stripNonGSM7(text: string): string {
  let result = '';
  for (const char of text) {
    if (isGSM7Char(char)) {
      result += char;
    } else if (/[a-zA-Z0-9\s.,!?;:'"()\-+]/.test(char)) {
      result += char;
    } else {
      const translit: Record<string, string> = {
        'á': 'a', 'â': 'a', 'ã': 'a', 'ā': 'a',
        'ć': 'c', 'č': 'c',
        'ď': 'd',
        'ě': 'e', 'ę': 'e', 'ë': 'e', 'ē': 'e',
        'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i',
        'ĺ': 'l', 'ľ': 'l',
        'ń': 'n', 'ň': 'n',
        'ó': 'o', 'ô': 'o', 'õ': 'o', 'ō': 'o',
        'ŕ': 'r', 'ř': 'r',
        'ś': 's', 'š': 's',
        'ť': 't',
        'ú': 'u', 'ů': 'u', 'û': 'u', 'ū': 'u',
        'ý': 'y', 'ÿ': 'y',
        'ź': 'z', 'ž': 'z',
        'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ā': 'A',
        'Ć': 'C', 'Č': 'C',
        'Ď': 'D',
        'Ě': 'E', 'Ę': 'E', 'Ë': 'E', 'Ē': 'E',
        'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ī': 'I',
        'Ĺ': 'L', 'Ľ': 'L',
        'Ń': 'N', 'Ň': 'N',
        'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ō': 'O',
        'Ŕ': 'R', 'Ř': 'R',
        'Ś': 'S', 'Š': 'S',
        'Ť': 'T',
        'Ú': 'U', 'Ů': 'U', 'Û': 'U', 'Ū': 'U',
        'Ý': 'Y', 'Ÿ': 'Y',
        'Ź': 'Z', 'Ž': 'Z',
      };
      result += translit[char] ?? '?';
    }
  }
  return result;
}

export function gsm7Length(text: string): number {
  let len = 0;
  for (const char of text) {
    len += char in GSM7_EXTENSION ? 2 : 1;
  }
  return len;
}

export function truncateToGSM7(text: string, maxBytes: number): string {
  let result = '';
  let bytes = 0;
  for (const char of text) {
    const charLen = char in GSM7_EXTENSION ? 2 : 1;
    if (bytes + charLen > maxBytes) break;
    result += char;
    bytes += charLen;
  }
  return result;
}
