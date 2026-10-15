// 构建：把 src/ 下的样式与脚本内联为单文件 dist/index.html
const fs = require('fs');
const path = require('path');
const src = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const ORDER = ['astro.js', 'calendar.js', 'ziwei.js', 'content.js', 'analysis.js', 'cities.js', 'app.js'];
const js = ORDER.map((f) => `/* ===== ${f} ===== */\n` + src(f).replace(/\nif \(typeof module !== 'undefined'\)[^\n]*\n?/g, '\n')).join('\n');
const html = src('index.template.html').replace('/*@CSS@*/', () => src('styles.css')).replace('/*@JS@*/', () => js);
for (const folder of ['dist', 'docs']) {
  fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
  fs.writeFileSync(path.join(__dirname, folder, 'index.html'), html);
  console.log(`${folder}/index.html`, (html.length / 1024).toFixed(1), 'KB');
}
