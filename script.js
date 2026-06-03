/**
 * 心晴小怪 - 完整交互脚本
 */
document.addEventListener('DOMContentLoaded', function () {

    // 注册 Service Worker (PWA) - 仅在服务器环境
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('SW 注册成功'))
            .catch(err => console.log('SW 注册失败:', err));
    }

    /* ============================
       DOM 引用
    ============================ */
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // 主页
    const planet         = $('#planet');
    const planetWrapper  = $('#planetWrapper');
    const planetBgLayer  = $('#planetBgLayer');
    const weatherLayer   = $('#weatherLayer');
    const planetGlow     = $('#planetGlow');
    const moodEmoji      = $('#moodEmoji');
    const moodName       = $('#moodName');
    const moodDescTag    = $('#moodDescTag');
    const homeSubtitle   = $('#homeSubtitle');
    const recordBtn      = $('#recordBtn');

    // 弹窗
    const moodModal     = $('#moodModal');
    const modalStep1    = $('#modalStep1');
    const modalStep2    = $('#modalStep2');
    const closeModal    = $('#closeModal');
    const closeDetail   = $('#closeDetailModal');
    const moodCards     = $$('.mood-card');

    // 详情步
    const detailMoodTitle = $('#detailMoodTitle');
    const detailEmoji    = $('#detailEmoji');
    const detailMoodName = $('#detailMoodName');
    const intensitySlider= $('#intensitySlider');
    const intensityValue = $('#intensityValue');
    const intensityDots  = $('#intensityDots');
    const noteInput      = $('#noteInput');
    const noteCount      = $('#noteCount');
    const stickerItems   = $$('.sticker-item');
    const detailBackBtn  = $('#detailBackBtn');
    const detailSaveBtn  = $('#detailSaveBtn');

    // 日历
    const calendarGrid   = $('#calendarGrid');
    const calMonthLabel  = $('#calMonthLabel');
    const calPrev        = $('#calPrev');
    const calNext        = $('#calNext');
    const dayDetailModal = $('#dayDetailModal');
    const dayDetailTitle = $('#dayDetailTitle');
    const dayDetailBody  = $('#dayDetailBody');
    const closeDayDetail = $('#closeDayDetail');

    // 今日
    const riverFlow  = $('#riverFlow');
    const todayDate = $('#todayDate');

    // 统计
    const starTrailCanvas = $('#starTrailCanvas');

    // 导航
    const navItems = $$('.nav-item');

    /* ============================
       心情配置表
    ============================ */
    const MOODS = {
        happy:   { emoji: '😊', name: '开心',   desc: '星球在发光呢', subtitle: '今天心情超棒！', bg: 'bg-happy',    flower: '🌻' },
        calm:    { emoji: '😌', name: '平静',   desc: '微风轻轻吹',   subtitle: '今天的心情是什么样子呀？', bg: 'bg-calm',     flower: '🌸' },
        tired:   { emoji: '😴', name: '疲惫',   desc: '星球困困的',   subtitle: '辛苦了，好好休息吧', bg: 'bg-tired',    flower: '🥀' },
        sad:     { emoji: '😢', name: '难过',   desc: '下起了小雨',   subtitle: '抱抱，会好起来的', bg: 'bg-sad',      flower: '💧' },
        anxious: { emoji: '😰', name: '焦虑',   desc: '小旋风转呀转', subtitle: '深呼吸，慢慢来', bg: 'bg-anxious',  flower: '🌾' },
        angry:   { emoji: '😤', name: '生气',   desc: '小火山冒泡泡', subtitle: '喝杯水，消消气', bg: 'bg-angry',    flower: '🌺' }
    };

    /* ============================
       状态
    ============================ */
    const STORAGE_KEY = 'xq_records_v2';
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    let currentMood    = 'calm';
    let currentIntensity = 3;
    let currentNote    = '';
    let currentSticker= '';
    let quickMode     = false;
    let calYear  = new Date().getFullYear();
    let calMonth = new Date().getMonth();
    let starsData = [];
    let starInteractionMode = 'arc'; // 'arc' | 'scatter'

    /* ============================
       初始化
    ============================ */
    function init() {
        loadLastMood();
        setTodayDate();
        bindEvents();
        renderCalendar();
        renderStats();
    }

    function setTodayDate() {
        const d = new Date();
        const weeks = ['日','一','二','三','四','五','六'];
        todayDate.textContent = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 星期' + weeks[d.getDay()];
    }

    /* ============================
       事件绑定
    ============================ */
    function bindEvents() {
        // 记录心情按钮
        recordBtn.addEventListener('click', openMoodModalStep1);
        closeModal.addEventListener('click', () => closeMoodModal(true));
        closeDetail.addEventListener('click', () => closeMoodModal(true));
        moodModal.addEventListener('click', e => { if (e.target === moodModal) closeMoodModal(true); });

        // 心情卡片
        moodCards.forEach(card => {
            card.addEventListener('click', function () {
                const mood = this.dataset.mood;
                goToStep2(mood);
            });
        });

        // 返回上一步
        detailBackBtn.addEventListener('click', () => goToStep1());

        // 强度拉条
        intensitySlider.addEventListener('input', function () {
            currentIntensity = parseInt(this.value);
            intensityValue.textContent = currentIntensity;
            intensityDots.dataset.active = currentIntensity;
        });

        // 短句输入
        noteInput.addEventListener('input', function () {
            currentNote = this.value;
            noteCount.textContent = this.value.length;
        });

        // 贴纸选择
        stickerItems.forEach(item => {
            item.addEventListener('click', function () {
                stickerItems.forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                currentSticker = this.dataset.sticker;
            });
        });

        // 保存记录
        detailSaveBtn.addEventListener('click', saveMoodRecord);

        // 导航
        navItems.forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                switchPage(this.dataset.page, this);
            });
        });

        // 日历
        calPrev.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
        calNext.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
        closeDayDetail.addEventListener('click', () => dayDetailModal.classList.remove('show'));
        dayDetailModal.addEventListener('click', e => { if (e.target === dayDetailModal) dayDetailModal.classList.remove('show'); });

        // 键盘
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && moodModal.classList.contains('show')) closeMoodModal(true);
        });
    }

    /* ============================
       页面切换
    ============================ */
    function switchPage(page, el) {
        navItems.forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        $$('.page').forEach(p => p.classList.remove('active'));
        const target = $('#page-' + page);
        if (target) {
            target.classList.add('active');
            target.style.animation = 'none';
            target.offsetHeight;
            target.style.animation = '';
        }
        if (page === 'today') renderRiverFlow();
        if (page === 'calendar') renderCalendar();
        if (page === 'stats') { renderStats(); }
    }

    /* ============================
       心情记录弹窗
    ============================ */
    function openMoodModalStep1() {
        quickMode = false;
        moodModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        goToStep1();
    }

    function goToStep1() {
        modalStep1.style.display = '';
        modalStep2.style.display = 'none';
    }

    function goToStep2(mood) {
        currentMood = mood;
        const info = MOODS[mood];

        // 更新详情页
        detailMoodTitle.textContent = '记录' + info.name;
        detailEmoji.textContent = info.emoji;
        detailMoodName.textContent = info.name;

        // 重置表单
        intensitySlider.value = 3;
        intensityValue.textContent = 3;
        intensityDots.dataset.active = 3;
        noteInput.value = '';
        noteCount.textContent = '0';
        currentNote = '';
        stickerItems.forEach(s => s.classList.remove('selected'));
        currentSticker = '';

        // 如果是快速打卡模式，保持在 step2
        if (quickMode) {
            modalStep1.style.display = 'none';
            modalStep2.style.display = '';
            return;
        }

        modalStep1.style.display = 'none';
        modalStep2.style.display = '';
    }

    function closeMoodModal(clearQuick = false) {
        moodModal.classList.remove('show');
        document.body.style.overflow = '';
        if (clearQuick) quickMode = false;
        goToStep1();
    }

    function saveMoodRecord() {
        const record = {
            mood: currentMood,
            intensity: currentIntensity,
            note: currentNote,
            sticker: currentSticker,
            time: new Date().toISOString(),
            timestamp: Date.now()
        };

        records.push(record);
        if (records.length > 100) records = records.slice(-100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

        // 更新星球
        applyMoodToPlanet(currentMood, currentIntensity, currentNote, currentSticker);

        // 快速打卡模式
        if (quickMode) {
            showToast(MOODS[currentMood].desc + ' ✓');
            // 重置表单但留在 step2
            intensitySlider.value = 3;
            intensityValue.textContent = 3;
            intensityDots.dataset.active = 3;
            noteInput.value = '';
            noteCount.textContent = '0';
            currentNote = '';
            stickerItems.forEach(s => s.classList.remove('selected'));
            currentSticker = '';
        } else {
            closeMoodModal();
            showToast(MOODS[currentMood].desc);
        }
    }

    /* ============================
       星球心情动画
    ============================ */
    function applyMoodToPlanet(mood, intensity, note, sticker) {
        const info = MOODS[mood];
        moodEmoji.textContent = info.emoji;
        moodName.textContent = info.name;
        homeSubtitle.textContent = info.subtitle;

        // 描述文字
        if (note) {
            moodDescTag.textContent = note;
        } else if (sticker) {
            moodDescTag.textContent = sticker + ' ' + info.desc;
        } else {
            moodDescTag.textContent = info.desc;
        }

        // 全屏背景渐变
        planetBgLayer.className = 'planet-bg-layer';
        planetBgLayer.classList.add('page-home-bg-' + mood);

        // 星球样式
        planet.className = 'planet mood-' + mood;
        planetWrapper.className = 'planet-wrapper mood-' + mood;
        weatherLayer.innerHTML = '';
        planetGlow.style.background = '';

        switch (mood) {
            case 'happy':   createSparkles();  planetGlow.style.background = 'radial-gradient(circle, rgba(242,209,201,0.35) 0%, transparent 70%)'; break;
            case 'calm':    planetGlow.style.background = 'radial-gradient(circle, rgba(200,221,226,0.2) 0%, transparent 70%)'; break;
            case 'tired':   planetGlow.style.background = 'radial-gradient(circle, rgba(197,191,182,0.1) 0%, transparent 70%)'; break;
            case 'sad':     createRain();      planetGlow.style.background = 'radial-gradient(circle, rgba(168,196,212,0.2) 0%, transparent 70%)'; break;
            case 'anxious': createTornado();   planetGlow.style.background = 'radial-gradient(circle, rgba(212,197,185,0.15) 0%, transparent 70%)'; break;
            case 'angry':   createBubbles();   planetGlow.style.background = 'radial-gradient(circle, rgba(212,168,160,0.2) 0%, transparent 70%)'; break;
        }
    }

    function createSparkles() {
        for (let i = 0; i < 12; i++) {
            const s = document.createElement('div');
            s.className = 'happy-sparkle';
            s.style.cssText = `left:${20+Math.random()*60}%;top:${10+Math.random()*60}%;animation-delay:${Math.random()*2}s;animation-duration:${1+Math.random()*1.5}s;width:${3+Math.random()*4}px;height:${3+Math.random()*4}px`;
            weatherLayer.appendChild(s);
        }
    }
    function createRain() {
        for (let i = 0; i < 15; i++) {
            const r = document.createElement('div');
            r.className = 'raindrop';
            r.style.cssText = `left:${15+Math.random()*70}%;top:10%;animation-delay:${Math.random()*1.5}s;animation-duration:${0.8+Math.random()*0.5}s;height:${8+Math.random()*8}px`;
            weatherLayer.appendChild(r);
        }
    }
    function createTornado() {
        for (let i = 0; i < 8; i++) {
            const t = document.createElement('div');
            t.className = 'tornado-particle';
            t.style.cssText = `left:50%;top:50%;animation-delay:${i*0.25}s;width:${4+Math.random()*4}px;height:${4+Math.random()*4}px`;
            weatherLayer.appendChild(t);
        }
    }
    function createBubbles() {
        for (let i = 0; i < 8; i++) {
            const b = document.createElement('div');
            b.className = 'volcano-bubble';
            b.style.cssText = `left:${30+Math.random()*40}%;bottom:20%;animation-delay:${Math.random()*2}s;animation-duration:${2+Math.random()*1.5}s;width:${5+Math.random()*6}px;height:${5+Math.random()*6}px`;
            weatherLayer.appendChild(b);
        }
    }

    function loadLastMood() {
        if (records.length > 0) {
            const last = records[records.length - 1];
            currentMood = last.mood;
            applyMoodToPlanet(last.mood, last.intensity || 3, last.note || '', last.sticker || '');
        }
    }

    /* ============================
       今日页 - 心情流
    ============================ */
    function getTodayRecords() {
        const today = new Date().toDateString();
        return records.filter(r => new Date(r.time).toDateString() === today);
    }

    function renderRiverFlow() {
        const todayRecords = getTodayRecords();
        riverFlow.innerHTML = '';

        if (todayRecords.length === 0) {
            riverFlow.innerHTML = `
                <div class="river-empty">
                    <div class="river-empty-icon">🌊</div>
                    <p>今天还没有心情记录哦</p>
                    <p class="river-empty-hint">去主页记录你的第一个心情吧</p>
                </div>`;
            return;
        }

        todayRecords.forEach((record, index) => {
            const info = MOODS[record.mood];
            const time = new Date(record.time);
            const timeStr = pad(time.getHours()) + ':' + pad(time.getMinutes());

            const intensityDotsHTML = [1,2,3,4,5].map(v =>
                `<span class="${v <= (record.intensity || 3) ? 'active' : ''}"></span>`
            ).join('');

            const item = document.createElement('div');
            item.className = 'river-item';
            item.dataset.mood = record.mood;
            item.style.animationDelay = (index * 0.1) + 's';
            item.innerHTML = `
                <div class="river-item-icon">${info.emoji}</div>
                <div class="river-item-body">
                    <div class="river-item-top">
                        <span class="river-item-mood">${info.name}</span>
                        ${record.sticker ? `<span class="river-item-sticker">${record.sticker}</span>` : ''}
                    </div>
                    ${record.note ? `<div class="river-item-note">${record.note}</div>` : ''}
                    <div class="river-item-time">${timeStr}</div>
                    <div class="river-item-intensity">${intensityDotsHTML}</div>
                </div>
            `;
            riverFlow.appendChild(item);
        });
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    /* ============================
       日历页 - 心情花园
    ============================ */
    function renderCalendar() {
        const year = calYear;
        const month = calMonth;
        const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        calMonthLabel.textContent = year + '年 ' + months[month];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.toDateString();

        calendarGrid.innerHTML = '';

        // 空格子
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'cal-day empty';
            calendarGrid.appendChild(empty);
        }

        // 日期格子
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = new Date(year, month, d).toDateString();
            const dayRecords = records.filter(r => new Date(r.time).toDateString() === dateStr);
            const isToday = dateStr === todayStr;

            // 取当天最后一个心情
            const lastMood = dayRecords.length > 0 ? dayRecords[dayRecords.length - 1].mood : null;
            const flower = lastMood ? MOODS[lastMood].flower : '';

            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day' + (isToday ? ' today' : '');
            dayEl.innerHTML = `
                <span class="cal-day-flower">${flower || ''}</span>
                <span class="cal-day-num">${d}</span>
            `;

            dayEl.addEventListener('click', () => openDayDetail(year, month, d, dayRecords));
            calendarGrid.appendChild(dayEl);
        }
    }

    function openDayDetail(year, month, day, dayRecords) {
        const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        dayDetailTitle.textContent = `${month + 1}月${day}日的心情`;

        if (dayRecords.length === 0) {
            dayDetailBody.innerHTML = '<div class="day-detail-empty">这一天还没有心情记录 🌱</div>';
        } else {
            dayDetailBody.innerHTML = dayRecords.map(r => {
                const info = MOODS[r.mood];
                const time = new Date(r.time);
                const timeStr = pad(time.getHours()) + ':' + pad(time.getMinutes());
                const intensityDots = [1,2,3,4,5].map(v =>
                    `<span class="${v <= (r.intensity || 3) ? 'active' : ''}"></span>`
                ).join('');
                return `
                    <div class="river-item" data-mood="${r.mood}" style="animation:none">
                        <div class="river-item-icon">${info.emoji}</div>
                        <div class="river-item-body">
                            <div class="river-item-top">
                                <span class="river-item-mood">${info.name}</span>
                                ${r.sticker ? `<span class="river-item-sticker">${r.sticker}</span>` : ''}
                            </div>
                            ${r.note ? `<div class="river-item-note">${r.note}</div>` : ''}
                            <div class="river-item-time">${timeStr}</div>
                            <div class="river-item-intensity">${intensityDots}</div>
                        </div>
                    </div>`;
            }).join('');
        }

        dayDetailModal.classList.add('show');
    }

    /* ============================
       统计页 - 流星轨迹
    ============================ */
    const moodOrbitSvg = $('#moodOrbitSvg');
    const moodDistribution = $('#moodDistribution');
    const statsTotalDays = $('#statsTotalDays');
    const moodOrbitChart = $('#moodOrbitChart');

    function renderStats() {
        renderMoodOrbit();
        renderMoodDistribution();
        renderTotalDays();
    }

    // 渲染心情星轨（最近7天）
    function renderMoodOrbit() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 获取最近7天的记录，按日期分组取每天最后一个记录
        const dailyMoods = {};
        records.forEach(r => {
            const recordDate = new Date(r.time);
            if (recordDate >= sevenDaysAgo && recordDate <= now) {
                const dateKey = recordDate.toDateString();
                if (!dailyMoods[dateKey] || recordDate > new Date(dailyMoods[dateKey].time)) {
                    dailyMoods[dateKey] = r;
                }
            }
        });

        // 转换为数组并按日期排序
        const sortedDays = Object.keys(dailyMoods).sort((a, b) => new Date(a) - new Date(b));
        const recentMoods = sortedDays.map(date => dailyMoods[date]);

        // 如果没有数据，显示空状态
        if (recentMoods.length === 0) {
            moodOrbitSvg.innerHTML = `
                <text x="170" y="60" text-anchor="middle" fill="var(--text-faint)" font-size="12">还没有足够的数据</text>
                <text x="170" y="80" text-anchor="middle" fill="var(--text-faint)" font-size="10">多记录几天心情吧</text>
            `;
            return;
        }

        // 心情对应的Y坐标（平静在中间，开心在上，难过在下）
        const moodYPositions = {
            happy: 30,
            calm: 60,
            tired: 75,
            sad: 90,
            anxious: 50,
            angry: 45
        };

        // 心情对应的颜色
        const moodColors = {
            happy: 'var(--macaron-happy)',
            calm: 'var(--macaron-calm)',
            tired: 'var(--macaron-tired)',
            sad: 'var(--macaron-sad)',
            anxious: 'var(--macaron-anxious)',
            angry: 'var(--macaron-angry)'
        };

        // 生成路径点 — 星星沿弧形排列
        const points = recentMoods.map((record, i) => {
            const total = Math.max(recentMoods.length - 1, 1);
            const x = 24 + (i / total) * 292;
            // 弧形：中间高两端低，心情影响弧线偏移
            const arcBase = 70 - Math.sin((i / total) * Math.PI) * 25;
            const moodOffset = (moodYPositions[record.mood] - 60) * 0.4;
            const y = arcBase + moodOffset;
            return { x, y, record, mood: record.mood };
        });

        // 生成平滑曲线路径
        let pathD = '';
        if (points.length > 0) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
                const cpy1 = prev.y;
                const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
                const cpy2 = curr.y;
                pathD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
            }
        }

        // 渲染SVG
        let svgHTML = '';

        // 绘制虚线路径
        if (points.length > 1) {
            svgHTML += `<path class="mood-orbit-path" d="${pathD}" />`;
        }

        // 绘制星星
        points.forEach((point, i) => {
            const info = MOODS[point.mood];
            const color = moodColors[point.mood];
            svgHTML += `
                <g class="mood-orbit-point" data-index="${i}" data-mood="${point.mood}" transform="translate(${point.x}, ${point.y})">
                    <text class="orbit-star" fill="${color}" font-size="18" text-anchor="middle" dominant-baseline="central">★</text>
                </g>
            `;
        });

        moodOrbitSvg.innerHTML = svgHTML;

        // 计算心情波动性（基于Y坐标变化）
        let volatility = 0;
        if (points.length > 1) {
            const yValues = points.map(p => p.y);
            const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
            const variance = yValues.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / yValues.length;
            volatility = Math.sqrt(variance); // 标准差
        }

        // 保存波动性到图表元素
        moodOrbitChart.dataset.volatility = volatility;

        // 点击"点击晃一晃"文字 → 所有星星一起晃动
        const shakeHint = document.querySelector('.stats-card-hint');
        if (shakeHint) {
            shakeHint.style.cursor = 'pointer';
            shakeHint.onclick = function(e) {
                e.stopPropagation();
                triggerOrbitAnimation(moodOrbitChart, volatility);
            };
        }

        // 点击单颗星星 → 只有那颗星星晃动
        const stars = moodOrbitChart.querySelectorAll('.orbit-star');
        stars.forEach(star => {
            star.style.cursor = 'pointer';
            star.onclick = function(e) {
                e.stopPropagation();
                triggerSingleStarAnimation(star, volatility);
            };
        });
    }

    // 单颗星星晃动
    function triggerSingleStarAnimation(star, volatility) {
        const isVolatile = volatility > 15;

        if (isVolatile) {
            star.style.setProperty('--jumpY1', ((Math.random() - 0.5) * 20) + 'px');
            star.style.setProperty('--jumpY2', ((Math.random() - 0.5) * 20) + 'px');
            star.style.setProperty('--jumpY3', ((Math.random() - 0.5) * 20) + 'px');
            star.style.setProperty('--jumpY4', ((Math.random() - 0.5) * 20) + 'px');
            star.classList.add('jumping');
            setTimeout(() => star.classList.remove('jumping'), 700);
        } else {
            star.classList.add('shaking');
            setTimeout(() => star.classList.remove('shaking'), 500);
        }
    }

    // 触发星轨动画
    function triggerOrbitAnimation(chart, volatility) {
        // 动画应用到内部的 .orbit-star 元素，避免覆盖SVG <g> 的 transform
        const stars = chart.querySelectorAll('.orbit-star');

        // 波动阈值：标准差 > 15 认为是波动大
        const isVolatile = volatility > 15;

        if (isVolatile) {
            // 波动大：星星上下跳跃（幅度 ±10px，0.7秒）
            stars.forEach((star, i) => {
                // 只设置Y方向的跳跃参数（上下跳）
                star.style.setProperty('--jumpY1', ((Math.random() - 0.5) * 20) + 'px');
                star.style.setProperty('--jumpY2', ((Math.random() - 0.5) * 20) + 'px');
                star.style.setProperty('--jumpY3', ((Math.random() - 0.5) * 20) + 'px');
                star.style.setProperty('--jumpY4', ((Math.random() - 0.5) * 20) + 'px');
                
                // 添加跳跃动画类，带延迟形成波浪
                setTimeout(() => {
                    star.classList.add('jumping');
                }, i * 80);
                
                // 移除动画类
                setTimeout(() => {
                    star.classList.remove('jumping');
                }, 700 + i * 80);
            });
        } else {
            // 稳定：原地温柔晃动两下（±5px，0.5秒）
            stars.forEach((star, i) => {
                setTimeout(() => {
                    star.classList.add('shaking');
                }, i * 60);
                setTimeout(() => {
                    star.classList.remove('shaking');
                }, 500 + i * 60);
            });
        }
    }

    // 渲染心情分布
    function renderMoodDistribution() {
        // 统计各心情的数量
        const moodCounts = {};
        let totalCount = 0;

        records.forEach(r => {
            moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
            totalCount++;
        });

        // 心情顺序和名称
        const moodOrder = ['calm', 'happy', 'tired', 'sad', 'anxious', 'angry'];
        const moodLabels = {
            calm: '平静',
            happy: '开心',
            tired: '疲惫',
            sad: '难过',
            anxious: '焦虑',
            angry: '生气'
        };

        // 生成HTML
        let html = '';
        moodOrder.forEach(mood => {
            const count = moodCounts[mood] || 0;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            const barWidth = totalCount > 0 ? (count / totalCount) * 100 : 0;

            html += `
                <div class="mood-dist-item" data-mood="${mood}">
                    <span class="mood-dist-label">${moodLabels[mood]}</span>
                    <div class="mood-dist-bar-wrap">
                        <div class="mood-dist-bar" style="width: ${barWidth}%"></div>
                    </div>
                    <span class="mood-dist-info">${count}天 · ${percentage}%</span>
                </div>
            `;
        });

        moodDistribution.innerHTML = html;
    }

    // 渲染总天数
    function renderTotalDays() {
        // 计算有记录的天数（去重）
        const recordedDays = new Set();
        records.forEach(r => {
            recordedDays.add(new Date(r.time).toDateString());
        });

        const days = recordedDays.size;
        statsTotalDays.textContent = `已记录 ${days} 天的心情`;
    }

    /* ============================
       Toast
    ============================ */
    function showToast(text) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = text;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 300);
        }, 1500);
    }

    /* ============================
       设置功能 - 清空数据、每日提醒、主题皮肤
    ============================ */
    const SETTINGS_KEY = 'xq_settings_v2';
    const THEME_KEY = 'xq_theme_v2';
    const REMINDER_KEY = 'xq_reminder_v2';

    // 设置项DOM引用
    const themeSettingsItem = $('#themeSettingsItem');
    const reminderSettingsItem = $('#reminderSettingsItem');
    const clearDataSettingsItem = $('#clearDataSettingsItem');
    const themeDesc = $('#themeDesc');
    const reminderDesc = $('#reminderDesc');

    // 弹窗DOM引用
    const clearDataModal = $('#clearDataModal');
    const closeClearData = $('#closeClearData');
    const cancelClearData = $('#cancelClearData');
    const confirmClearData = $('#confirmClearData');

    const reminderModal = $('#reminderModal');
    const closeReminder = $('#closeReminder');
    const reminderTime = $('#reminderTime');
    const reminderEnabled = $('#reminderEnabled');
    const saveReminder = $('#saveReminder');

    const themeModal = $('#themeModal');
    const closeTheme = $('#closeTheme');
    const themeItems = $$('.theme-item');

    // 主题名称映射
    const THEME_NAMES = {
        morandi: '莫兰迪经典',
        macaron: '马卡龙甜心',
        forest: '森林秘境',
        ocean: '海洋之心',
        sunset: '落日余晖',
        lavender: '薰衣草梦'
    };

    // 初始化设置
    function initSettings() {
        // 加载主题
        const savedTheme = localStorage.getItem(THEME_KEY) || 'morandi';
        applyTheme(savedTheme);
        updateThemeDesc(savedTheme);

        // 加载提醒设置
        const reminderSettings = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}');
        if (reminderSettings.enabled) {
            reminderDesc.textContent = reminderSettings.time || '21:00';
        }

        // 绑定设置项点击事件
        themeSettingsItem.addEventListener('click', openThemeModal);
        reminderSettingsItem.addEventListener('click', openReminderModal);
        clearDataSettingsItem.addEventListener('click', openClearDataModal);

        // 清空数据弹窗事件
        closeClearData.addEventListener('click', () => closeSettingsModal(clearDataModal));
        cancelClearData.addEventListener('click', () => closeSettingsModal(clearDataModal));
        confirmClearData.addEventListener('click', clearAllData);
        clearDataModal.addEventListener('click', e => { if (e.target === clearDataModal) closeSettingsModal(clearDataModal); });

        // 提醒设置弹窗事件
        closeReminder.addEventListener('click', () => closeSettingsModal(reminderModal));
        saveReminder.addEventListener('click', saveReminderSettings);
        reminderModal.addEventListener('click', e => { if (e.target === reminderModal) closeSettingsModal(reminderModal); });

        // 主题选择弹窗事件
        closeTheme.addEventListener('click', () => closeSettingsModal(themeModal));
        themeItems.forEach(item => {
            item.addEventListener('click', () => selectTheme(item.dataset.theme));
        });
        themeModal.addEventListener('click', e => { if (e.target === themeModal) closeSettingsModal(themeModal); });

        // 初始化提醒检查
        initReminderCheck();
    }

    // 打开清空数据弹窗
    function openClearDataModal() {
        clearDataModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 打开提醒设置弹窗
    function openReminderModal() {
        const settings = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}');
        reminderTime.value = settings.time || '21:00';
        reminderEnabled.checked = settings.enabled || false;
        const reminderType = document.querySelector(`input[name="reminderType"][value="${settings.type || 'vibrate'}"]`);
        if (reminderType) reminderType.checked = true;
        reminderModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 打开主题选择弹窗
    function openThemeModal() {
        const currentTheme = localStorage.getItem(THEME_KEY) || 'morandi';
        themeItems.forEach(item => {
            item.classList.toggle('selected', item.dataset.theme === currentTheme);
        });
        themeModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // 关闭设置弹窗
    function closeSettingsModal(modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    // 清空所有数据
    function clearAllData() {
        // 清空localStorage中的记录
        localStorage.removeItem(STORAGE_KEY);
        records = [];

        // 重置星球状态
        currentMood = 'calm';
        applyMoodToPlanet('calm', 3, '', '');
        moodEmoji.textContent = '😌';
        moodName.textContent = '平静';
        homeSubtitle.textContent = '今天的心情是什么样子呀？';
        moodDescTag.textContent = '';
        planetBgLayer.className = 'planet-bg-layer';
        planet.className = 'planet';
        planetWrapper.className = 'planet-wrapper';
        weatherLayer.innerHTML = '';

        // 刷新日历和心情流
        renderCalendar();
        renderRiverFlow();
        renderStats();

        closeSettingsModal(clearDataModal);
        showToast('所有数据已清空 ✓');
    }

    // 保存提醒设置
    function saveReminderSettings() {
        const time = reminderTime.value;
        const enabled = reminderEnabled.checked;
        const type = document.querySelector('input[name="reminderType"]:checked').value;

        const settings = { time, enabled, type };
        localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));

        // 更新设置项描述
        if (enabled) {
            reminderDesc.textContent = time;
        } else {
            reminderDesc.textContent = '未设置';
        }

        closeSettingsModal(reminderModal);
        showToast('提醒设置已保存 ✓');
    }

    // 选择主题
    function selectTheme(theme) {
        applyTheme(theme);
        localStorage.setItem(THEME_KEY, theme);
        updateThemeDesc(theme);

        // 更新选中状态
        themeItems.forEach(item => {
            item.classList.toggle('selected', item.dataset.theme === theme);
        });

        closeSettingsModal(themeModal);
        showToast(`已切换至${THEME_NAMES[theme]} ✓`);
    }

    // 应用主题
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // 更新主题描述
    function updateThemeDesc(theme) {
        themeDesc.textContent = THEME_NAMES[theme] || '莫兰迪经典';
    }

    // 提醒检查
    function initReminderCheck() {
        // 每分钟检查一次是否需要提醒
        setInterval(checkReminder, 60000);
        // 页面加载时也检查一次
        checkReminder();
    }

    function checkReminder() {
        const settings = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}');
        if (!settings.enabled) return;

        const now = new Date();
        const currentTime = pad(now.getHours()) + ':' + pad(now.getMinutes());

        if (currentTime === settings.time) {
            // 检查今天是否已经提醒过
            const lastReminder = localStorage.getItem('xq_last_reminder');
            const today = now.toDateString();

            if (lastReminder !== today) {
                localStorage.setItem('xq_last_reminder', today);

                if (settings.type === 'vibrate') {
                    // 震动提醒
                    if (navigator.vibrate) {
                        navigator.vibrate([200, 100, 200, 100, 400]);
                    }
                    showToast('⏰ 该记录心情啦！');
                } else {
                    // 弹窗提醒
                    showReminderPopup();
                }
            }
        }
    }

    // 显示提醒弹窗
    function showReminderPopup() {
        const popup = document.createElement('div');
        popup.className = 'modal show';
        popup.style.zIndex = '300';
        popup.innerHTML = `
            <div class="modal-content" style="max-height: 40vh; text-align: center; padding: 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">⏰</div>
                <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">该记录心情啦！</h3>
                <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 1rem;">今天的心情是什么样的呢？</p>
                <button class="reminder-save-btn" id="reminderPopupBtn" style="width: auto; padding: 0.6rem 2rem;">去记录</button>
            </div>
        `;
        document.body.appendChild(popup);

        popup.addEventListener('click', e => {
            if (e.target === popup || e.target.id === 'reminderPopupBtn') {
                popup.remove();
                if (e.target.id === 'reminderPopupBtn') {
                    // 切换到主页并打开记录弹窗
                    navItems[0].click();
                    setTimeout(() => recordBtn.click(), 300);
                }
            }
        });
    }

    /* ============================
       启动
    ============================ */
    init();
    initSettings();
});
