'use strict';
// Kiểm tra và chuẩn hóa tệp đề (cùng quy tắc với trang web). Đáp án lưu theo số thứ tự bắt đầu từ 1.

function normLevel(s) {
  const m = String(s || '').toUpperCase().match(/N\s*([1-5])/);
  return m ? 'N' + m[1] : '';
}

function stripFence(t) {
  return String(t).replace(/^\uFEFF/, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

const MAX_QUESTIONS = 600;

function parseExams(data, fallbackName) {
  const errors = [];
  let list;
  if (Array.isArray(data)) list = [{ name: fallbackName, questions: data }];
  else if (data && Array.isArray(data.exams)) list = data.exams;
  else if (data && Array.isArray(data.questions)) list = [data];
  else return { errors: ['Không tìm thấy danh sách “questions” trong JSON.'], exams: [] };

  const exams = [];
  list.forEach(function (e, ei) {
    const tag = list.length > 1 ? 'Đề thứ ' + (ei + 1) + ': ' : '';
    const name = String((e && e.name) || fallbackName || '').trim();
    if (!name) errors.push(tag + 'chưa có tên đề (“name”).');
    else if (name.length > 100) errors.push(tag + 'tên đề dài quá 100 ký tự.');
    if (!e || !Array.isArray(e.questions) || !e.questions.length) { errors.push(tag + 'không có câu hỏi nào.'); return; }
    if (e.questions.length > MAX_QUESTIONS) { errors.push(tag + 'có quá ' + MAX_QUESTIONS + ' câu.'); return; }
    const qs = [];
    e.questions.forEach(function (q, i) {
      const lab = tag + 'Câu ' + (i + 1) + ': ';
      if (!q || typeof q !== 'object') { errors.push(lab + 'không hợp lệ.'); return; }
      const section = String(q.section || '').trim();
      const text = String(q.text || '').trim();
      const ch = Array.isArray(q.choices) ? q.choices.map(function (c) { return String(c).trim(); }) : [];
      const ans = Number(q.answer);
      let bad = false;
      if (!section) { errors.push(lab + 'thiếu “section”.'); bad = true; }
      else if (section.length > 10) { errors.push(lab + '“section” dài quá 10 ký tự.'); bad = true; }
      if (!text) { errors.push(lab + 'thiếu “text”.'); bad = true; }
      else if (text.length > 4000) { errors.push(lab + '“text” dài quá 4000 ký tự.'); bad = true; }
      if (ch.length < 2 || ch.length > 6 || ch.some(function (c) { return !c || c.length > 1000; })) { errors.push(lab + '“choices” cần 2 đến 6 đáp án, không để trống, mỗi đáp án tối đa 1000 ký tự.'); bad = true; }
      else if (!Number.isInteger(ans) || ans < 1 || ans > ch.length) { errors.push(lab + '“answer” phải là số từ 1 đến ' + ch.length + '.'); bad = true; }
      const opt = { sectionTitle: [q.sectionTitle, 60], mondai: [q.mondai, 100], instruction: [q.instruction, 1000], group: [q.group, 100], passage: [q.passage, 20000], explanation: [q.explanation, 4000] };
      const extra = {};
      Object.keys(opt).forEach(function (k) {
        const v = String(opt[k][0] == null ? '' : opt[k][0]).trim();
        if (v.length > opt[k][1]) { errors.push(lab + '“' + k + '” dài quá ' + opt[k][1] + ' ký tự.'); bad = true; }
        else if (v) extra[k] = v;
      });
      if (bad) return;
      const out = { section: section };
      ['sectionTitle', 'mondai', 'instruction', 'group', 'passage'].forEach(function (k) { if (extra[k]) out[k] = extra[k]; });
      out.text = text; out.choices = ch; out.answer = ans;
      if (extra.explanation) out.explanation = extra.explanation;
      qs.push(out);
    });
    if (name && name.length <= 100) exams.push({ name: name, level: normLevel(e.level) || normLevel(name), questions: qs });
  });
  return { errors: errors, exams: exams };
}

module.exports = { parseExams, normLevel, stripFence };
