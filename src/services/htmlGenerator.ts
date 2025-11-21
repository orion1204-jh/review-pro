import { ParsedExamData } from "../types";

export const generateStandaloneHtml = (title: string, parsedData: ParsedExamData): string => {
  // Convert the parsed array back to the object format used in the original HTML
  // and format vocab/summary as HTML strings
  const dataObject: Record<string, any> = {};
  
  parsedData.questions.forEach(q => {
    // Format Vocab: <li><strong>Word:</strong> Meaning</li>
    const vocabHtml = q.vocab
      .map(v => `<li><strong>${v.word}:</strong> ${v.meaning}</li>`)
      .join('');
      
    // Format Summary: Wrap in <p> if not already
    const summaryHtml = q.summary.trim().startsWith('<p>') 
      ? q.summary 
      : `<p>${q.summary}</p>`;

    dataObject[q.id] = {
      tag: q.tag,
      text: q.text,
      trans: q.trans,
      vocab: vocabHtml,
      summary: summaryHtml
    };
  });

  const jsonString = JSON.stringify(dataObject, null, 4);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
<title>${title} | Review Pro</title>
<meta name="theme-color" content="#F5F5F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<style>
    :root {
        --bg-body: #F5F5F7;
        --bg-card: rgba(255, 255, 255, 0.85);
        --bg-nav: rgba(255, 255, 255, 0.75);
        --text-primary: #1d1d1f;
        --text-secondary: #86868b;
        --text-tertiary: #A1A1A6;
        --accent-blue: #0071e3;
        --accent-blue-hover: #0077ed;
        --accent-bg: rgba(0, 113, 227, 0.08);
        --divider: rgba(0, 0, 0, 0.1);
        --blank-bg: #eef0f2;
        --blank-hover: #e0e2e5;
        --trans-bg: #f9f9f9;
        --shadow-card: 0 10px 30px rgba(0, 0, 0, 0.04);
        --radius-l: 24px;
        --radius-m: 12px;
        --nav-height: 60px;
        --ring-track: #e5e5ea;
        --ring-progress: #34c759; 
        --nav-active-bg: #1d1d1f;
        --nav-active-text: #ffffff;
        --font-stack: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
        :root {
            --bg-body: #000000;
            --bg-card: #1c1c1e;
            --bg-nav: rgba(28, 28, 30, 0.75);
            --text-primary: #f5f5f7;
            --text-secondary: #86868b;
            --text-tertiary: #6E6E73;
            --accent-blue: #2997ff;
            --accent-blue-hover: #47aaff;
            --accent-bg: rgba(41, 151, 255, 0.15);
            --divider: #38383a;
            --blank-bg: #2c2c2e;
            --blank-hover: #3a3a3c;
            --trans-bg: #252527;
            --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);
            --ring-track: #3a3a3c;
            --ring-progress: #30d158;
            --nav-active-bg: #ffffff; 
            --nav-active-text: #000000; 
        }
    }
    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
    html { scroll-behavior: smooth; scroll-padding-top: 80px; }
    body { font-family: var(--font-stack); background-color: var(--bg-body); color: var(--text-primary); margin: 0; line-height: 1.6; transition: background-color 0.4s ease; }
    h1, h2, h3, p, ul { margin: 0; padding: 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; color: var(--text-secondary); }
    strong { color: var(--text-primary); font-weight: 600; }
    nav { position: fixed; top: 0; left: 0; width: 100%; height: calc(var(--nav-height) + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top); background: var(--bg-nav); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); z-index: 1000; border-bottom: 1px solid var(--divider); display: flex; align-items: center; transition: all 0.3s ease; }
    .nav-container { max-width: 92%; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 10px; }
    .nav-left { display: flex; align-items: center; gap: 20px; overflow: hidden; flex: 1; }
    .nav-logo { font-weight: 700; font-size: 18px; color: var(--text-primary); white-space: nowrap; cursor: pointer; display: flex; align-items: center; gap: 5px; }
    .nav-links { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-right: 20px; mask-image: linear-gradient(to right, black 90%, transparent 100%); -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%); }
    .nav-links::-webkit-scrollbar { display: none; }
    .nav-links a { text-decoration: none; color: var(--text-secondary); font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 20px; transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1); white-space: nowrap; }
    .nav-links a:hover { color: var(--text-primary); background: var(--divider); }
    .nav-links a.active { color: var(--nav-active-text) !important; background-color: var(--nav-active-bg) !important; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .nav-tools { display: flex; align-items: center; gap: 15px; flex-shrink: 0; }
    .progress-ring { position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
    .progress-ring circle { fill: transparent; stroke-width: 3; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 0.5s ease-out; }
    .ring-bg { stroke: var(--ring-track); }
    .ring-val { stroke: var(--ring-progress); stroke-linecap: round; }
    .hero { text-align: center; padding: 160px 20px 80px; max-width: 85%; margin: 0 auto; opacity: 0; transform: translateY(20px); animation: fadeUp 0.8s ease-out forwards; }
    .hero h1 { font-size: 58px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 24px; background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero p { font-size: 22px; color: var(--text-secondary); font-weight: 400; }
    @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
    main { max-width: 85%; margin: 0 auto; padding: 0 20px 100px; }
    .card { background: var(--bg-card); border-radius: var(--radius-l); padding: 40px; margin-bottom: 60px; box-shadow: var(--shadow-card); border: 1px solid rgba(0,0,0,0.03); scroll-margin-top: 110px; opacity: 0; transform: translateY(40px); transition: opacity 0.7s ease-out, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
    .card.visible { opacity: 1; transform: translateY(0); }
    .card-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--divider); }
    .card-header h2 { font-size: 24px; font-weight: 600; color: var(--text-primary); }
    .tag { font-size: 12px; font-weight: 600; color: var(--accent-blue); background: var(--accent-bg); padding: 4px 12px; border-radius: 20px; text-transform: uppercase; }
    .english-text p { font-size: 17px; line-height: 1.8; color: var(--text-primary); font-weight: 400; text-align: justify; letter-spacing: normal; }
    .blank { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; height: 28px; padding: 0 8px; margin: 0 3px; background-color: var(--blank-bg); color: transparent; border-radius: 8px; cursor: pointer; font-size: 17px; font-weight: 600; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); user-select: none; vertical-align: middle; -webkit-tap-highlight-color: transparent; }
    .blank:hover { background-color: var(--blank-hover); transform: scale(1.05); }
    .blank.revealed { background-color: transparent; color: var(--accent-blue); min-width: auto; padding: 0 2px; animation: popInSpring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes popInSpring { 0% { opacity: 0; transform: scale(0.8) translateY(5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    .controls-container { margin-top: 35px; display: flex; flex-direction: column; gap: 20px; }
    .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
    button.action-btn { border: none; padding: 12px 24px; border-radius: 980px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: var(--font-stack); display: flex; align-items: center; gap: 8px; -webkit-tap-highlight-color: transparent; }
    button.action-btn svg { width: 14px; height: 14px; fill: currentColor; }
    .btn-primary { background-color: var(--accent-blue); color: white; box-shadow: 0 4px 12px rgba(0,113,227,0.3); }
    .btn-primary:hover { background-color: var(--accent-blue-hover); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,113,227,0.4); }
    .btn-secondary { background-color: var(--blank-bg); color: var(--text-primary); }
    .btn-secondary:hover { background-color: var(--blank-hover); transform: translateY(-1px); }
    button.action-btn:active { transform: scale(0.97) !important; }
    .analysis-section { margin-top: 30px; padding-top: 30px; border-top: 1px solid var(--divider); display: none; animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .analysis-section.active { display: block; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .analysis-section h3 { font-size: 18px; margin-bottom: 15px; margin-top: 25px; color: var(--text-primary); }
    .analysis-section h3:first-child { margin-top: 0; }
    .korean-translation { font-size: 16px; color: var(--text-secondary); line-height: 1.7; background: var(--trans-bg); padding: 20px; border-radius: var(--radius-m); }
    .vocab-list li { font-size: 16px; color: var(--text-primary); line-height: 1.7; margin-bottom: 6px; }
    .content-explanation { background: var(--accent-bg); padding: 20px; border-radius: var(--radius-m); border-left: 3px solid var(--accent-blue); }
    .content-explanation p { font-size: 16px; color: var(--text-primary); line-height: 1.7; }
    footer { text-align: center; padding: 60px 20px 80px; color: var(--text-secondary); font-size: 12px; border-top: 1px solid var(--divider); background: var(--bg-body); }
    @media (max-width: 768px) {
        .hero { padding-top: 120px; }
        .hero h1 { font-size: 45px; }
        .nav-container { max-width: 96%; }
        .card { padding: 24px; border-radius: 20px; margin-bottom: 40px; }
        main { max-width: 100%; padding: 0 16px 100px; } 
        .action-buttons { flex-direction: column; }
        button.action-btn { width: 100%; justify-content: center; }
        .english-text p { font-size: 16px; text-align: left; } 
        .nav-logo span { display: inline; } 
    }
</style>
</head>
<body>

<svg style="display: none;">
    <symbol id="icon-refresh" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></symbol>
    <symbol id="icon-eye" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></symbol>
    <symbol id="icon-check" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></symbol>
</svg>

<nav>
    <div class="nav-container">
        <div class="nav-left">
            <div class="nav-logo" onclick="window.scrollTo({top:0, behavior:'smooth'})"> Review Pro</div>
            <div class="nav-links" id="nav-links">
                <!-- JS Generated Links -->
            </div>
        </div>
        <div class="nav-tools">
            <div class="progress-ring" title="Review Progress">
                <svg width="28" height="28">
                    <circle class="ring-bg" r="11" cx="14" cy="14" stroke-dasharray="69 69"></circle>
                    <circle class="ring-val" id="global-progress" r="11" cx="14" cy="14" stroke-dasharray="69 69" stroke-dashoffset="69"></circle>
                </svg>
            </div>
        </div>
    </div>
</nav>

<div class="hero">
    <h1>Mastering English.</h1>
    <p>${title}</p>
</div>

<main id="main-content">
    <!-- Cards injected via JS -->
</main>

<footer>
    <p>Designed with  style aesthetics. Content generated by AI.</p>
</footer>

<script>
const data = ${jsonString};

const main = document.getElementById('main-content');
const navLinksContainer = document.getElementById('nav-links');
let totalBlanks = 0;
let revealedBlanks = 0;

Object.keys(data).forEach(key => {
    const item = data[key];

    const link = document.createElement('a');
    link.href = '#' + key;
    link.textContent = key.toUpperCase().replace('Q', 'Q');
    navLinksContainer.appendChild(link);

    const article = document.createElement('article');
    article.id = key;
    article.className = 'card';
    article.innerHTML = \`
        <div class="card-header">
            <h2>Question \${key.replace('q', '')}</h2>
            <span class="tag">\${item.tag}</span>
        </div>
        <div class="english-text" id="text-\${key}"><p>\${item.text}</p></div>
        <div class="controls-container">
            <div class="action-buttons">
                <button class="action-btn btn-secondary" onclick="refreshBlanks('\${key}')"><svg><use href="#icon-refresh"></use></svg> New Blanks</button>
                <button class="action-btn btn-secondary" onclick="revealAll('\${key}')"><svg><use href="#icon-check"></use></svg> Reveal All</button>
                <button class="action-btn btn-primary" onclick="toggleAnalysis('\${key}')"><svg><use href="#icon-eye"></use></svg> View Analysis</button>
            </div>
        </div>
        <div id="analysis-\${key}" class="analysis-section">
            <h3>Translation</h3><div class="korean-translation">\${item.trans}</div>
            <h3>Vocabulary</h3><ul class="vocab-list">\${item.vocab}</ul>
            <h3>Summary</h3><div class="content-explanation">\${item.summary}</div>
        </div>
    \`;
    main.appendChild(article);
    refreshBlanks(key);
});

function refreshBlanks(id) {
    const container = document.querySelector('#text-' + id + ' p');
    const originalText = data[id].text;
    const words = originalText.split(/(\\s+)/);
    const minLength = 3;
    const density = 0.30;
    const validIndices = words.map((w, i) => ({w, i})).filter(obj => obj.w.trim().length > minLength && !/^[A-Z]\\)/.test(obj.w));
    
    for (let i = validIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
    }
    
    const targetIndices = new Set(validIndices.slice(0, Math.floor(validIndices.length * density)).map(o => o.i));
    
    const newHTML = words.map((word, idx) => {
        if (targetIndices.has(idx)) {
            const clean = word.trim();
            return '<span class="blank" onclick="toggleBlank(this)" data-answer="' + clean + '"></span>' + word.replace(clean, '');
        }
        return word;
    }).join('');
    
    container.innerHTML = newHTML;
    updateGlobalProgress();
}

function toggleBlank(el) {
    if (!el.classList.contains('revealed')) {
        el.textContent = el.dataset.answer;
        el.classList.add('revealed');
    } else {
        el.textContent = '';
        el.classList.remove('revealed');
    }
    updateGlobalProgress();
}

function revealAll(id) {
    const blanks = document.querySelectorAll('#text-' + id + ' .blank');
    blanks.forEach(b => {
        if (!b.classList.contains('revealed')) {
            b.textContent = b.dataset.answer;
            b.classList.add('revealed');
        }
    });
    updateGlobalProgress();
}

function toggleAnalysis(id) {
    const analysisDiv = document.getElementById('analysis-' + id);
    const btn = document.querySelector('#' + id + ' .btn-primary');
    if (!analysisDiv.classList.contains('active')) {
        analysisDiv.classList.add('active');
        btn.innerHTML = '<svg><use href="#icon-eye"></use></svg> Hide Analysis';
    } else {
        analysisDiv.classList.remove('active');
        btn.innerHTML = '<svg><use href="#icon-eye"></use></svg> View Analysis';
    }
}

function updateGlobalProgress() {
    const allBlanks = document.querySelectorAll('.blank');
    const revealed = document.querySelectorAll('.blank.revealed');
    totalBlanks = allBlanks.length;
    revealedBlanks = revealed.length;
    const circle = document.getElementById('global-progress');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = circumference + ' ' + circumference;
    document.querySelector('.ring-bg').style.strokeDasharray = circumference + ' ' + circumference;
    const percentage = totalBlanks === 0 ? 0 : (revealedBlanks / totalBlanks);
    const offset = circumference - (percentage * circumference);
    circle.style.strokeDashoffset = offset;
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            const id = entry.target.id;
            document.querySelectorAll('.nav-links a').forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href') === '#' + id) {
                    a.classList.add('active');
                    a.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }
    });
}, { rootMargin: '-20% 0px -50% 0px', threshold: 0.1 });

document.querySelectorAll('article').forEach(section => observer.observe(section));
window.addEventListener('load', updateGlobalProgress);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 90;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = target.getBoundingClientRect().top;
            const offsetPosition = elementRect - bodyRect - offset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    });
});
</script>
</body>
</html>`;
};