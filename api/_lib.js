// File dùng chung cho các API. Dấu _ ở đầu tên nghĩa là Vercel KHÔNG biến nó thành endpoint.
export const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
export const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// ===== Giới hạn theo gói (đếm ở SERVER, mỗi ngày giờ Việt Nam) =====
// Số 0 = không được dùng. Infinity = không giới hạn.
// chat/video là mức chặn lạm dụng (giao diện không công bố con số này), chỉnh tuỳ ý.
export const PLAN_LIMITS = {
  free: { chat: 300,  genImg: 3,   readImg: 5,        video: 0 },
  plus: { chat: 1500, genImg: 30,  readImg: 50,       video: 0 },
  pro:  { chat: 5000, genImg: 100, readImg: Infinity, video: 20 }
};

const KIND_NAME = { chat: "nhắn tin", genImg: "tạo ảnh", readImg: "đọc ảnh", video: "đọc video" };

export function splitKeys(v) {
  return (v || "").split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
}

// Xác minh người gọi API bằng access token của Supabase. Trả về user hoặc null.
export async function getUser(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token || !SB_URL || !SB_KEY) return null;
  try {
    const r = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + token }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) { return null; }
}

// Gọi Supabase bằng service key (chỉ chạy ở server, không bao giờ đưa ra trình duyệt)
export function sb(path, opts = {}) {
  return fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });
}

// Gói hiện tại của user: 'free' | 'plus' | 'pro' (hết hạn thì về free)
export async function getPlan(userId) {
  try {
    const r = await sb("subscriptions?user_id=eq." + encodeURIComponent(userId) + "&select=plan,expires_at");
    const rows = await r.json();
    const s = Array.isArray(rows) && rows[0];
    if (s && s.expires_at && new Date(s.expires_at) > new Date() && (s.plan === "plus" || s.plan === "pro")) return s.plan;
  } catch (e) {}
  return "free";
}

// Giữ chỗ 1 lượt (nguyên tử trong DB). true = còn lượt và đã trừ, false = hết lượt
async function reserve(userId, kind, limit) {
  const lim = limit === Infinity ? 1000000000 : limit;
  const r = await sb("rpc/consume_usage", {
    method: "POST",
    body: JSON.stringify({ p_user: userId, p_kind: kind, p_limit: lim })
  });
  if (!r.ok) throw new Error("usage check failed");
  return (await r.json()) === true;
}

// Trả lại 1 lượt khi yêu cầu thất bại (để người dùng không bị mất lượt oan)
export async function refund(userId, kind) {
  try {
    await sb("rpc/refund_usage", { method: "POST", body: JSON.stringify({ p_user: userId, p_kind: kind }) });
  } catch (e) {}
}

// Cổng chặn dùng chung: bắt buộc đăng nhập + kiểm tra gói + trừ lượt.
// Thành công trả {user, plan}. Thất bại thì đã tự trả lỗi cho client và trả null.
export async function guard(req, res, kind) {
  if (!SB_URL || !SB_KEY) {
    res.status(500).json({ error: { message: "Server chưa cấu hình Supabase (SUPABASE_URL, SUPABASE_SERVICE_KEY)" } });
    return null;
  }
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: { message: "Cần đăng nhập để dùng Zeno" } });
    return null;
  }
  const plan = await getPlan(user.id);
  const limit = (PLAN_LIMITS[plan] || PLAN_LIMITS.free)[kind];
  if (!(limit > 0)) {
    res.status(403).json({ error: { message: kind === "video" ? "Đọc video chỉ có ở gói Zeno Pro." : "Gói của mày không có tính năng này." } });
    return null;
  }
  let ok = false;
  try { ok = await reserve(user.id, kind, limit); }
  catch (e) {
    res.status(500).json({ error: { message: "Không kiểm tra được lượt dùng, thử lại sau" } });
    return null;
  }
  if (!ok) {
    res.status(429).json({ error: { message: "Hôm nay mày dùng hết lượt " + KIND_NAME[kind] + " của gói " + plan.toUpperCase() + " rồi. Mai được làm mới, hoặc nâng cấp để có thêm." } });
    return null;
  }
  return { user, plan };
}
