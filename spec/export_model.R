# =============================================================================
#  export_model.R — ส่งออกโมเดลจาก R เข้าสู่เว็บแอป PromoSignal
#  ผลลัพธ์: ไฟล์ JSON ตามสัญญา promosignal-model/1 ที่ลากเข้าแอปได้ทันที
#
#  วิธีใช้
#    1. แก้ค่าในบล็อก "ตั้งค่า" ให้ตรงกับข้อมูลของคุณ
#    2. source("export_model.R")
#    3. เปิดเว็บแอป → แท็บ "ข้อมูลและโมเดล" → ลากไฟล์ model.json เข้าไป
#
#  หมายเหตุสำคัญ
#    * ต้อง mean-center ตัวแปรทุกตัวก่อนสร้างพจน์ปฏิสัมพันธ์ ไม่งั้นตีความ main effect ผิด
#    * ส่งออกเฉพาะสัมประสิทธิ์และเมทริกซ์ความแปรปรวนร่วม ไม่ส่งข้อมูลดิบ
#      จึงไม่มีชื่อบริษัทหรือชื่อบุคคลหลุดออกไป
# =============================================================================

library(MASS)      # glm.nb
library(jsonlite)

# ----------------------------------------------------------------- ตั้งค่า ---
DATA_PATH <- "panel_clean.csv"
OUT_PATH  <- "model.json"

MODEL_NAME <- "ชุดโมเดล C — Innovation Intensity"
MODEL_KEY  <- "C"

TARGET     <- "innov_total"                       # ตัวแปรตาม
TARGET_LAB <- "ความเข้มของนวัตกรรม (Innovation Intensity)"
TARGET_SCALE <- "count"                           # "count" หรือ "rate"

# ตัวแปรหลัก 8 ตัว — แก้ชื่อและป้ายให้ตรงกับสเปกที่ตกลงกัน
MAIN <- c("promotion", "female_pct", "wa_board_tenure", "indep_pct",
          "board_size", "pol_tie", "family_pct", "ceo_tenure")

LABELS <- c(
  promotion       = "Promotion focus (ภาษาเชิงรุก)",
  female_pct      = "สัดส่วนกรรมการหญิง",
  wa_board_tenure = "อายุงานเฉลี่ยของบอร์ด",
  indep_pct       = "สัดส่วนกรรมการอิสระ",
  board_size      = "ขนาดคณะกรรมการ",
  pol_tie         = "มีกรรมการเชื่อมโยงการเมือง",
  family_pct      = "สัดส่วนกรรมการครอบครัว",
  ceo_tenure      = "อายุงาน CEO",
  ln_assets       = "ขนาดบริษัท (ln สินทรัพย์)",
  firm_age        = "อายุบริษัท",
  roa             = "ROA",
  de_ratio_w      = "หนี้สินต่อทุน"
)
UNITS <- c(female_pct = "%", indep_pct = "%", family_pct = "%",
           wa_board_tenure = "ปี", ceo_tenure = "ปี", firm_age = "ปี",
           board_size = "คน", roa = "%", de_ratio_w = "เท่า")
BOOLS <- c("pol_tie")

CTRL  <- c("ln_assets", "firm_age", "roa", "de_ratio_w")
INTER <- c()   # เช่น c("promotion:female_pct", "promotion:pol_tie")

# ------------------------------------------------------------ เตรียมข้อมูล ---
d <- read.csv(DATA_PATH, fileEncoding = "UTF-8")

# ตัวแปรที่ต้องสร้างเอง — แก้ให้ตรงกับข้อมูลจริงของคุณ
d$pol_tie    <- as.numeric(ifelse(is.na(d$peps_bod), 0, d$peps_bod) > 0)
d$female_pct <- d$pct_female_board * 100
d$indep_pct  <- d$board_independence * 100
d$family_pct <- d$family_bod * 100

vars <- unique(c(MAIN, CTRL))
d <- d[complete.cases(d[, c(vars, TARGET, "year", "industry")]), ]
d$year     <- factor(d$year)
d$industry <- factor(d$industry)

# mean-center ทุกตัว แล้วเก็บค่ากลางไว้ส่งออก
center <- sapply(vars, function(v) mean(d[[v]]))
sdv    <- sapply(vars, function(v) sd(d[[v]]))
for (v in vars) d[[paste0("c_", v)]] <- d[[v]] - center[[v]]

# ---------------------------------------------------------------- ฟิตโมเดล ---
terms_c <- c(paste0("c_", MAIN),
             sapply(INTER, function(t) paste(paste0("c_", strsplit(t, ":")[[1]]), collapse = ":")),
             paste0("c_", CTRL))
fml <- as.formula(paste(TARGET, "~", paste(c(terms_c, "year", "industry"), collapse = " + ")))
m   <- glm.nb(fml, data = d)

cf <- coef(m); V <- vcov(m)
strip <- function(x) gsub("c_", "", x, fixed = TRUE)      # c_promotion -> promotion
keep  <- terms_c                                          # ไม่รวม fixed effect

# ---------------------------------------------------- fixed effect เป็นค่าฐาน ---
fe_of <- function(prefix, levels_) {
  out <- setNames(as.list(rep(0, length(levels_))), levels_)
  for (lv in levels_) {
    nm <- paste0(prefix, lv)
    if (nm %in% names(cf)) out[[lv]] <- unname(cf[[nm]])
  }
  out
}
fe_year <- fe_of("year", levels(d$year))
fe_ind  <- fe_of("industry", levels(d$industry))

# --------------------------------------------------------- ประกอบไฟล์สัญญา ---
mk_var <- function(v) {
  rng <- range(d[[v]])
  list(
    key = v, label = unname(ifelse(v %in% names(LABELS), LABELS[[v]], v)),
    unit = unname(ifelse(v %in% names(UNITS), UNITS[[v]], "")),
    min = floor(rng[1] * 100) / 100, max = ceiling(rng[2] * 100) / 100,
    step = if (v %in% BOOLS) 1 else signif((rng[2] - rng[1]) / 100, 2),
    dec = if (v %in% BOOLS) 0L else 2L,
    center = unname(center[[v]]), sd = unname(sdv[[v]]),
    control = v %in% CTRL, bool = v %in% BOOLS
  )
}

ord  <- c("Intercept", strip(keep))
Vsub <- V[c("(Intercept)", keep), c("(Intercept)", keep)]

y <- d[[TARGET]]
q <- unname(quantile(y, probs = seq(0, 1, .01), type = 7))

contract <- list(
  schema = "promosignal-model/1",
  name = MODEL_NAME, key = MODEL_KEY,
  produced_by = paste("R", getRversion(), "· MASS::glm.nb"),
  produced_at = format(Sys.Date(), "%Y-%m-%d"),
  target = list(var = TARGET, label = TARGET_LAB, family = "negbin",
                link = "log", scale = TARGET_SCALE),
  alpha = unname(1 / m$theta),                    # NB2: alpha = 1/theta
  intercept = unname(cf[["(Intercept)"]]),
  variables = lapply(unique(c(MAIN, CTRL)), mk_var),
  terms = strip(keep),
  coef = as.list(setNames(unname(cf[keep]), strip(keep))),
  se   = as.list(setNames(unname(sqrt(diag(V)[keep])), strip(keep))),
  p    = as.list(setNames(unname(summary(m)$coefficients[keep, 4]), strip(keep))),
  vcov = list(order = ord, matrix = lapply(seq_len(nrow(Vsub)), function(i) unname(Vsub[i, ]))),
  fixed_effects = list(year = fe_year, industry = fe_ind),
  fit = list(n = nrow(d), n_firms = length(unique(d$ticker)),
             llf = unname(logLik(m)), aic = unname(AIC(m)),
             pseudo_r2 = unname(1 - m$deviance / m$null.deviance)),
  reference = list(quantiles = q, mean = mean(y), median = median(y),
                   quintile_edges = unname(quantile(y, c(.2, .4, .6, .8), type = 7))),
  notes = "แก้ไขข้อความนี้เพื่อระบุข้อจำกัดที่ต้องแสดงคู่กับผลลัพธ์"
)

write(toJSON(contract, auto_unbox = TRUE, digits = 12, na = "null"), OUT_PATH)
cat("เขียนแล้ว:", OUT_PATH, "· พจน์", length(keep),
    "· n =", nrow(d), "· alpha =", round(1 / m$theta, 4), "\n")

# หมายเหตุ: ยังไม่ได้ใส่ oos — ถ้าต้องการให้แอปแสดงความแม่น ให้แบ่งข้อมูลตามปี
# เทรนด้วยปี <= t ทดสอบปี t+1 แล้วเติมบล็อก oos = list(n_test=, spearman=, c_index=, mase=, pi90_coverage=)
