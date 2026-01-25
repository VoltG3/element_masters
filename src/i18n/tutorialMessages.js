import i18n from './i18n';
import enMessages from './translations/en/tutorial_messages.json';
import lvMessages from './translations/lv/tutorial_messages.json';
import noMessages from './translations/no/tutorial_messages.json';
import ruMessages from './translations/ru/tutorial_messages.json';
import jaMessages from './translations/ja/tutorial_messages.json';

const MESSAGES = {
  en: enMessages,
  lv: lvMessages,
  no: noMessages,
  ru: ruMessages,
  ja: jaMessages
};

const getLang = (lang) => {
  const raw = lang || i18n?.language || 'en';
  const base = raw.includes('-') ? raw.split('-')[0] : raw;
  return MESSAGES[base] ? base : 'en';
};

export const getTutorialChapters = (lang) => {
  const l = getLang(lang);
  const data = MESSAGES[l] || MESSAGES.en || {};
  return Object.keys(data);
};

export const getTutorialItems = (chapter, lang) => {
  const l = getLang(lang);
  const data = MESSAGES[l] || MESSAGES.en || {};
  const chapterData = data[chapter] || {};
  return Object.keys(chapterData)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({ id, text: chapterData[id] }));
};

export const getTutorialText = (chapter, id, lang) => {
  if (!chapter || id === undefined || id === null) return '';
  const l = getLang(lang);
  const data = MESSAGES[l] || MESSAGES.en || {};
  const fallback = (MESSAGES.en || {})[chapter]?.[String(id)] || '';
  return data[chapter]?.[String(id)] || fallback;
};

export default {
  getTutorialChapters,
  getTutorialItems,
  getTutorialText
};
