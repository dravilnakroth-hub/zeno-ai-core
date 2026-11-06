
/**
 * ZENO AI - GAME KNOWLEDGE ROUTER
 * File: api/game-knowledge.js
 *
 * Nhiệm vụ:
 * - Nhận diện 10 game mục tiêu.
 * - Phân loại chủ đề người dùng đang hỏi.
 * - Cung cấp ngữ cảnh riêng cho từng game.
 * - Hạn chế AI bịa thông tin, số liệu và meta.
 *
 * Lưu ý:
 * Đây là bộ nhận diện và định tuyến kiến thức.
 * Nó KHÔNG tự tải dữ liệu game hoặc cập nhật meta.
 * Việc tra cứu dữ liệu thực tế sẽ được tích hợp riêng.
 */

const GAME_KNOWLEDGE = [
  {
    id: "roblox",
    name: "Roblox",
    status: "confirmed",
    platforms: ["Mobile", "PC", "Console"],
    aliases: [
      "roblox",
      "roblox vng"
    ],
    topics: [
      "Các trải nghiệm (experiences)",
      "Game modes và gameplay",
      "Robux và vật phẩm",
      "Avatar và tùy chỉnh nhân vật",
      "Roblox Studio và lập trình Lua",
      "Máy chủ và chơi nhiều người"
    ],
    specialRules: [
      "Phân biệt Roblox là nền tảng với từng experience cụ thể.",
      "Không nhầm Robux với tiền thật.",
      "Khi hỏi về một experience, không tự suy diễn tính năng của experience khác."
    ]
  },

  {
    id: "free-fire",
    name: "Garena Free Fire",
    status: "confirmed",
    platforms: ["Mobile"],
    aliases: [
      "free fire",
      "freefire",
      "free fire max",
      "ff max"
    ],
    topics: [
      "Nhân vật và kỹ năng",
      "Súng và trang bị",
      "Bản đồ",
      "Chế độ chơi",
      "Thú cưng",
      "Chiến thuật sinh tồn",
      "Sự kiện và cập nhật"
    ],
    specialRules: [
      "Phân biệt Free Fire thường và Free Fire MAX.",
      "Không tự bịa chỉ số súng, kỹ năng hoặc thời gian hồi chiêu.",
      "Thông tin sự kiện và meta cần kiểm tra theo phiên bản."
    ]
  },

  {
    id: "lien-quan",
    name: "Garena Liên Quân Mobile",
    status: "confirmed",
    platforms: ["Mobile"],
    aliases: [
      "lien quan",
      "lien quan mobile",
      "arena of valor",
      "aov"
    ],
    topics: [
      "Tướng và bộ kỹ năng",
      "Nội tại và chiêu thức",
      "Trang bị",
      "Phù hiệu và bảng ngọc",
      "Phép bổ trợ",
      "Vị trí và đường đi",
      "Chiến thuật giao tranh",
      "Meta và cập nhật"
    ],
    specialRules: [
      "Phải phân biệt chính xác nội tại, chiêu 1, chiêu 2 và chiêu cuối.",
      "Không tự đặt tên kỹ năng hoặc hiệu ứng không tồn tại.",
      "Không nhầm kỹ năng giữa các tướng.",
      "Khi tư vấn lên đồ phải xét vị trí, đội hình và phiên bản.",
      "Không khẳng định một tướng đang mạnh nhất nếu không có dữ liệu meta đáng tin cậy."
    ]
  },

  {
    id: "pubg-mobile",
    name: "PUBG Mobile",
    status: "confirmed",
    platforms: ["Mobile"],
    aliases: [
      "pubg mobile",
      "pubg mobile vn",
      "pubgm"
    ],
    topics: [
      "Bản đồ",
      "Vũ khí và phụ kiện",
      "Phương tiện",
      "Chế độ chơi",
      "Cơ chế chiến đấu",
      "Vòng bo",
      "Chiến thuật sinh tồn",
      "Cập nhật phiên bản"
    ],
    specialRules: [
      "Phân biệt PUBG Mobile với PUBG: Battlegrounds trên PC.",
      "Không nhầm thông số vũ khí giữa các phiên bản.",
      "Thông tin bản đồ, chế độ và vật phẩm cần đúng phiên bản."
    ]
  },

  {
    id: "candy-crush",
    name: "Candy Crush Saga",
    status: "confirmed",
    platforms: ["Mobile"],
    aliases: [
      "candy crush",
      "candy crush saga"
    ],
    topics: [
      "Luật chơi ghép kẹo",
      "Các loại kẹo đặc biệt",
      "Chướng ngại vật",
      "Mục tiêu màn chơi",
      "Chiến thuật vượt màn",
      "Sự kiện trong game"
    ],
    specialRules: [
      "Giải thích đúng cơ chế ghép kẹo và hiệu ứng.",
      "Không tự bịa cách hoạt động của vật cản.",
      "Nếu thiếu hình ảnh màn chơi, hãy hỏi thêm thay vì đoán bố cục."
    ]
  },

  {
    id: "league-of-legends",
    name: "League of Legends",
    status: "confirmed",
    platforms: ["PC"],
    aliases: [
      "lien minh huyen thoai",
      "league of legends",
      "lmht",
      "lol"
    ],
    topics: [
      "Tướng và kỹ năng",
      "Trang bị",
      "Ngọc bổ trợ",
      "Bảng ngọc",
      "Vai trò và vị trí",
      "Đi đường",
      "Giao tranh",
      "Chiến thuật đội hình",
      "Meta và bản cập nhật"
    ],
    specialRules: [
      "Phân biệt Liên Minh Huyền Thoại với Liên Minh: Tốc Chiến.",
      "Không nhầm tên kỹ năng hoặc chỉ số tướng.",
      "Build trang bị phải xét phiên bản và vai trò.",
      "Không khẳng định tỉ lệ thắng hoặc thứ hạng meta nếu thiếu nguồn."
    ]
  },

  {
    id: "fc-online",
    name: "FC Online",
    status: "confirmed",
    platforms: ["PC"],
    aliases: [
      "fc online",
      "fconline",
      "fifa online 4",
      "fo4"
    ],
    topics: [
      "Cầu thủ và mùa thẻ",
      "Chỉ số cầu thủ",
      "Đội hình",
      "Chiến thuật",
      "Lối chơi",
      "Vị trí cầu thủ",
      "Nâng cấp cầu thủ",
      "Thị trường chuyển nhượng"
    ],
    specialRules: [
      "Phân biệt các mùa thẻ của cùng một cầu thủ.",
      "Không tự bịa chỉ số hoặc giá cầu thủ.",
      "Giá thị trường thay đổi theo thời điểm và máy chủ.",
      "Tư vấn đội hình cần xét ngân sách và lối chơi."
    ]
  },

  {
    id: "valorant",
    name: "VALORANT",
    status: "confirmed",
    platforms: ["PC"],
    aliases: [
      "valorant",
      "valo"
    ],
    topics: [
      "Đặc vụ và kỹ năng",
      "Vũ khí",
      "Bản đồ",
      "Vai trò trong đội",
      "Chiến thuật tấn công và phòng thủ",
      "Kinh tế trong trận",
      "Xếp hạng",
      "Cập nhật phiên bản"
    ],
    specialRules: [
      "Không nhầm kỹ năng giữa các đặc vụ.",
      "Phân biệt sát thương, tầm bắn và độ chính xác của từng vũ khí.",
      "Không khẳng định meta hiện tại nếu chưa có dữ liệu phiên bản."
    ]
  },

  {
    id: "counter-strike-2",
    name: "Counter-Strike 2",
    status: "tentative",
    platforms: ["PC"],
    aliases: [
      "counter strike 2",
      "counter-strike 2",
      "cs2"
    ],
    topics: [
      "Vũ khí",
      "Bản đồ",
      "Lựu đạn trong game",
      "Kinh tế trong trận",
      "Chiến thuật đội",
      "Các chế độ chơi",
      "Cập nhật game"
    ],
    specialRules: [
      "Phân biệt Counter-Strike 2 với CS:GO.",
      "Không nhầm thông số vũ khí giữa các phiên bản.",
      "Không khẳng định meta hoặc giá vật phẩm nếu thiếu dữ liệu mới."
    ]
  },

  {
    id: "minecraft",
    name: "Minecraft",
    status: "confirmed",
    platforms: ["Mobile", "PC", "Console"],
    aliases: [
      "minecraft",
      "mc",
      "minecraft java",
      "minecraft bedrock",
      "minecraft pe"
    ],
    topics: [
      "Survival và Creative",
      "Hardcore",
      "Chế tạo và công thức",
      "Redstone",
      "Phù phép",
      "Thuốc và hiệu ứng",
      "Sinh vật và boss",
      "Biome và cấu trúc",
      "Lệnh trong game",
      "Datapack và addon",
      "Mod và plugin",
      "Server và multiplayer"
    ],
    specialRules: [
      "Luôn phân biệt Java Edition và Bedrock Edition khi có khác biệt.",
      "Phân biệt Minecraft trên điện thoại với Minecraft Java trên PC.",
      "Công thức chế tạo và lệnh phải đúng phiên bản.",
      "Không nhầm mod, addon, datapack và plugin.",
      "Không tự khẳng định một tính năng có trên mọi phiên bản."
    ]
  }
];


// Chuẩn hóa tiếng Việt để nhận diện từ khóa.
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}


// Đọc nội dung tin nhắn dạng text.
function getMessageText(message) {
  if (typeof message?.content === "string") {
    return message.content;
  }

  if (Array.isArray(message?.content)) {
    return message.content
      .filter(part => part?.type === "text")
      .map(part => part.text || "")
      .join(" ");
  }

  return "";
}


// Kiểm tra từ khóa độc lập, tránh nhận nhầm từ ngắn.
function containsWord(text, word) {
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(word);

  if (!normalizedText || !normalizedWord) return false;

  // Cụm từ có khoảng trắng: so khớp cụm đầy đủ.
  if (normalizedWord.includes(" ")) {
    return normalizedText.includes(normalizedWord);
  }

  const escaped = normalizedWord.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`,
    "u"
  ).test(normalizedText);
}


// Lấy nội dung các tin nhắn gần nhất của người dùng.
function getRecentUserText(messages, limit = 4) {
  if (!Array.isArray(messages)) return "";

  return messages
    .filter(message => message?.role === "user")
    .slice(-limit)
    .map(getMessageText)
    .join("\n");
}


// Nhận diện game được nhắc tới.
export function detectGames(messages, options = {}) {
  const maxGames = Math.max(
    1,
    Math.min(Number(options.maxGames) || 3, GAME_KNOWLEDGE.length)
  );

  const recentText = normalizeText(getRecentUserText(messages));

  if (!recentText) return [];

  const matched = GAME_KNOWLEDGE.filter(game =>
    game.aliases.some(alias => containsWord(recentText, alias))
  );

  return matched.slice(0, maxGames);
}


// Lấy thông tin một game bằng ID.
export function getGameById(id) {
  return GAME_KNOWLEDGE.find(game => game.id === id) || null;
}


// Xác định chủ đề câu hỏi.
export function detectGameTopic(message) {
  const text = normalizeText(message);

  if (!text) return "general";

  const groups = {
    skills: [
      "ky nang",
      "chieu 1",
      "chieu 2",
      "chieu cuoi",
      "noi tai",
      "skill"
    ],

    items: [
      "trang bi",
      "len do",
      "build",
      "item",
      "vu khi",
      "sung"
    ],

    meta: [
      "meta",
      "manh nhat",
      "yeu nhat",
      "tier",
      "ti le thang",
      "win rate",
      "ban cap nhat"
    ],

    strategy: [
      "chien thuat",
      "cach choi",
      "meo choi",
      "di duong",
      "doi hinh",
      "combo"
    ],

    technical: [
      "cai dat",
      "loi game",
      "fps",
      "lag",
      "cau hinh",
      "mod",
      "plugin",
      "server"
    ],

    crafting: [
      "che tao",
      "cong thuc",
      "redstone",
      "phu phep",
      "potion"
    ]
  };

  for (const [topic, keywords] of Object.entries(groups)) {
    if (keywords.some(keyword => containsWord(text, keyword))) {
      return topic;
    }
  }

  return "general";
}


// Tạo ngữ cảnh kiến thức game cho Zeno.
export function buildGameKnowledgeContext(messages, options = {}) {
  const games = detectGames(messages, options);

  if (!games.length) return "";

  const latestUserMessage = messages
    .filter(message => message?.role === "user")
    .slice(-1)[0];

  const topic = detectGameTopic(getMessageText(latestUserMessage));

  const gameProfiles = games.map(game => {
    return [
      `GAME: ${game.name}`,
      `ID: ${game.id}`,
      `Nền tảng: ${game.platforms.join(", ")}`,
      `Các mảng kiến thức: ${game.topics.join("; ")}`,
      `Quy tắc riêng: ${game.specialRules.join(" ")}`
    ].join("\n");
  });

  return `
=== ZENO GAME KNOWLEDGE ROUTER ===

Game được nhận diện:
${gameProfiles.join("\n\n")}

Chủ đề câu hỏi hiện tại: ${topic}

QUY TẮC TRẢ LỜI BẮT BUỘC:

1. Trả lời đúng game mà người dùng đang hỏi.
2. Không trộn dữ liệu giữa các game.
3. Không tự tạo tên nhân vật, kỹ năng, vật phẩm hoặc cơ chế.
4. Không tự bịa chỉ số, giá tiền, tỉ lệ thắng, thứ hạng hoặc meta.
5. Phân biệt rõ dữ liệu đã xác minh và kiến thức chưa được xác minh.
6. Nếu thiếu dữ liệu về phiên bản, hãy hỏi phiên bản khi điều đó ảnh hưởng đến câu trả lời.
7. Nếu có dữ liệu tra cứu từ nguồn khác trong ngữ cảnh, hãy ưu tiên dữ liệu đó.
8. Nếu không có nguồn đáng tin cậy cho thông tin mới nhất, hãy nói rõ giới hạn.
9. Khi hướng dẫn chiến thuật, giải thích lý do và điều kiện áp dụng.
10. Trả lời tự nhiên, có cấu trúc, không biến mọi câu hỏi thành bài viết quá dài.

LƯU Ý:
Bộ định tuyến này chỉ xác định game và chủ đề.
Nó không chứng minh rằng thông tin game đã được tra cứu hoặc xác minh.
Không được tuyên bố đã kiểm tra dữ liệu trực tuyến nếu chưa thực sự tra cứu.
=== END ZENO GAME KNOWLEDGE ROUTER ===
`.trim();
}


// Xuất danh sách game để những module khác có thể sử dụng.
export { GAME_KNOWLEDGE };
