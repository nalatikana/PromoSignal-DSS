* =============================================================================
*  export_model.do — ส่งออกโมเดลจาก Stata เข้าสู่เว็บแอป PromoSignal
*  ผลลัพธ์: ไฟล์ JSON ตามสัญญา promosignal-model/1
*
*  วิธีใช้
*    1. แก้ค่าใน local ด้านล่างให้ตรงกับข้อมูลของคุณ
*    2. do export_model.do
*    3. เปิดเว็บแอป -> แท็บ "ข้อมูลและโมเดล" -> ลากไฟล์ model.json เข้าไป
*
*  หมายเหตุ
*    * Stata ไม่มีตัวเขียน JSON ในตัว สคริปต์นี้จึงประกอบข้อความเอง
*    * ส่งออกเฉพาะสัมประสิทธิ์กับเมทริกซ์ความแปรปรวนร่วม ไม่ส่งข้อมูลดิบ
*    * nbreg ของ Stata รายงาน lnalpha -> alpha = exp(lnalpha) ซึ่งตรงกับ NB2 ที่แอปใช้
* =============================================================================
clear all
set more off

* ----------------------------------------------------------------- ตั้งค่า ---
local DATA   "panel_clean.csv"
local OUT    "model.json"
local NAME   "ชุดโมเดล C — Innovation Intensity"
local KEY    "C"
local TARGET "innov_total"
local TLAB   "ความเข้มของนวัตกรรม (Innovation Intensity)"
local TSCALE "count"

* ตัวแปรหลัก 8 ตัว และตัวแปรควบคุม
local MAIN  promotion female_pct wa_board_tenure indep_pct board_size pol_tie family_pct ceo_tenure
local CTRL  ln_assets firm_age roa de_ratio_w
local BOOLS pol_tie

* --------------------------------------------------------------- โหลดข้อมูล ---
import delimited "`DATA'", clear encoding(UTF-8) varnames(1)

* ตัวแปรที่ต้องสร้างเอง — แก้ให้ตรงกับข้อมูลจริง
gen byte pol_tie = (peps_bod > 0) if !missing(peps_bod)
replace  pol_tie = 0 if missing(peps_bod)
gen double female_pct = pct_female_board * 100
gen double indep_pct  = board_independence * 100
gen double family_pct = family_bod * 100

egen byte _ok = rownonmiss(`MAIN' `CTRL' `TARGET')
local NV : word count `MAIN' `CTRL' `TARGET'
keep if _ok == `NV'
drop _ok

encode industry, gen(ind_id)

* ------------------------------------------------ mean-center + เก็บค่ากลาง ---
local ALL `MAIN' `CTRL'
foreach v of local ALL {
    quietly summarize `v'
    local ctr_`v' = r(mean)
    local sd_`v'  = r(sd)
    local min_`v' = r(min)
    local max_`v' = r(max)
    quietly gen double c_`v' = `v' - r(mean)
}

* ---------------------------------------------------------------- ฟิตโมเดล ---
local RHS
foreach v of local ALL {
    local RHS `RHS' c_`v'
}
* ถ้าต้องการปฏิสัมพันธ์ ให้เพิ่มเอง เช่น  gen double c_promotion_X_c_female_pct = c_promotion*c_female_pct
* แล้วต่อท้าย local RHS และ local TERMS ให้ตรงกัน (ชื่อพจน์ในไฟล์ JSON ใช้รูปแบบ a:b)

nbreg `TARGET' `RHS' i.year i.ind_id, nolog
local NOBS = e(N)
local LLF  = e(ll)
local AIC  = -2*e(ll) + 2*e(rank)
local ALPHA = exp(_b[/lnalpha])

matrix b = e(b)
matrix V = e(V)

* --------------------------------------------------------- ประกอบไฟล์ JSON ---
tempname fh
file open `fh' using "`OUT'", write replace text

file write `fh' `"{"schema":"promosignal-model/1""'
file write `fh' `","name":"`NAME'","key":"`KEY'""'
file write `fh' `","produced_by":"Stata `c(stata_version)' · nbreg""'
file write `fh' `","produced_at":"`c(current_date)'""'
file write `fh' `","target":{"var":"`TARGET'","label":"`TLAB'","family":"negbin","link":"log","scale":"`TSCALE'"}"'
file write `fh' `","alpha":`ALPHA'"'
file write `fh' `","intercept":`=_b[_cons]'"'

* ---- variables ----
file write `fh' `","variables":["'
local first 1
foreach v of local ALL {
    local isctrl = 0
    foreach c of local CTRL {
        if "`v'" == "`c'" local isctrl = 1
    }
    local isbool = 0
    foreach c of local BOOLS {
        if "`v'" == "`c'" local isbool = 1
    }
    local step = cond(`isbool', 1, round((`max_`v'' - `min_`v'')/100, 0.01))
    if `step' == 0 local step = 0.01
    if !`first' file write `fh' ","
    file write `fh' `"{"key":"`v'","label":"`v'","unit":"""'
    file write `fh' `!,"min":`min_`v'',"max":`max_`v'',"step":`step',"dec":2"'
    file write `fh' `!,"center":`ctr_`v'',"sd":`sd_`v''"'
    file write `fh' `!,"control":`=cond(`isctrl',"true","false")',"bool":`=cond(`isbool',"true","false")'}"'
    local first 0
}
file write `fh' "]"

* ---- terms / coef / se / p ----
file write `fh' `","terms":["'
local first 1
foreach v of local ALL {
    if !`first' file write `fh' ","
    file write `fh' `""`v'""'
    local first 0
}
file write `fh' "]"

foreach part in coef se p {
    file write `fh' `","`part'":{"'
    local first 1
    foreach v of local ALL {
        if !`first' file write `fh' ","
        if "`part'" == "coef" local val = _b[c_`v']
        if "`part'" == "se"   local val = _se[c_`v']
        if "`part'" == "p"    local val = 2*normal(-abs(_b[c_`v']/_se[c_`v']))
        file write `fh' `""`v'":`val'"'
        local first 0
    }
    file write `fh' "}"
}

* ---- vcov (Intercept แล้วตามด้วยพจน์) ----
file write `fh' `","vcov":{"order":["Intercept""'
foreach v of local ALL {
    file write `fh' `","`v'""'
}
file write `fh' `"],"matrix":["'
local ROWS _cons
foreach v of local ALL {
    local ROWS `ROWS' c_`v'
}
local ri 0
foreach r of local ROWS {
    if `ri' > 0 file write `fh' ","
    file write `fh' "["
    local ci 0
    foreach c of local ROWS {
        if `ci' > 0 file write `fh' ","
        local rn = colnumb(V, "`r'")
        local cn = colnumb(V, "`c'")
        file write `fh' `"`=V[`rn',`cn']'"'
        local ci = `ci' + 1
    }
    file write `fh' "]"
    local ri = `ri' + 1
}
file write `fh' "]}"

* ---- fixed effects ----
file write `fh' `","fixed_effects":{"year":{"'
quietly levelsof year, local(YRS)
local first 1
foreach y of local YRS {
    if !`first' file write `fh' ","
    capture local v = _b[`y'.year]
    if _rc local v = 0
    file write `fh' `""`y'":`v'"'
    local first 0
}
file write `fh' `"},"industry":{"'
quietly levelsof ind_id, local(INDS)
local first 1
foreach i of local INDS {
    local lab : label (ind_id) `i'
    if !`first' file write `fh' ","
    capture local v = _b[`i'.ind_id]
    if _rc local v = 0
    file write `fh' `""`lab'":`v'"'
    local first 0
}
file write `fh' "}}"

* ---- fit + reference ----
file write `fh' `","fit":{"n":`NOBS',"llf":`LLF',"aic":`AIC'}"'

quietly summarize `TARGET', detail
local YMEAN = r(mean)
local YMED  = r(p50)
file write `fh' `","reference":{"mean":`YMEAN',"median":`YMED',"quintile_edges":["'
local first 1
foreach p in 20 40 60 80 {
    quietly _pctile `TARGET', p(`p')
    if !`first' file write `fh' ","
    file write `fh' `"`r(r1)'"'
    local first 0
}
file write `fh' "]}"

file write `fh' `","notes":"แก้ไขข้อความนี้เพื่อระบุข้อจำกัดที่ต้องแสดงคู่กับผลลัพธ์"}"'
file close `fh'

display as result "เขียนแล้ว: `OUT' · n = `NOBS' · alpha = " %6.4f `ALPHA'

* หมายเหตุ: reference.quantiles (101 ค่า) ไม่ได้ใส่ในสคริปต์นี้เพื่อความกระชับ
* ถ้าไม่มี แอปจะใช้การกระจายของโมเดลตั้งต้นในการจัดอันดับเปอร์เซ็นไทล์แทน
