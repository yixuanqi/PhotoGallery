// Lightweight zero-dependency i18n module (zh-CN / en-US) for Steam-ready localization
import { G } from './state.js';
import { storage } from './storage.js';

const LOCALE_KEY = 'ashen_bell_vow_locale_v15';

const DICT = {
  'zh-CN': {
    'game.title': '灰钟残誓',
    'game.subtitle': 'ASHEN BELL VOW · 暗黑手绘魂系类银河恶魔城原型',
    'btn.continue': '继续残誓',
    'btn.startNew': '唤醒人偶',
    'btn.startOverwrite': '覆写档案 {0} 重开',
    'btn.startSlot': '于档案 {0} 唤醒人偶',
    'slot.label': '档案 {0}',
    'slot.empty': '空档',
    'slot.emptyDesc': '尚未铭刻残誓 · 点击选中后唤醒人偶',
    'slot.summary': '{0} · 探索 {1}% · 首领 {2}/3',
    'slot.erase': '抹除',
    'slot.confirmErase': '确定抹除「档案 {0}」的所有进度吗？此操作不可撤销。',
    'slot.selectedInfo': '当前选中档案 {0}：{1} · 探索 {2}% · 圣物 {3}/{4}{5}{6}',
    'pause.title': '残 誓 暂 歇',
    'pause.sub': '档案 {0} · 探索 {1}% · 游玩 {2}',
    'pause.resume': '继续前行',
    'pause.settings': '设置与音频',
    'pause.respawn': '返回最近祭坛',
    'pause.titleBtn': '保存并返回标题',
    'hud.soul': '魂火 {0}',
    'hud.flasks': '灯油',
    'hud.seals': '墨印',
    'hud.explore': '探索 {0}%',
    'hud.map': '地图 [M]',
    'hud.help': '心法',
    'hud.settings': '设置',
    'hud.respawn': '回祭坛',
    'hud.muteOn': '音效: 开',
    'hud.muteOff': '音效: 关',
    'hud.ctrlKb': '操控: 键鼠',
    'hud.ctrlKey': '操控: 纯键',
    'settings.title': '设置与护道辅助',
    'settings.sub': '界面语言 · 辅助难度微调 · 手柄双马达震动 · 键盘自定义改键',
    'settings.secAudio': '语言、护道辅助 & 外设反馈',
    'settings.lang': '界面语言 (Language)',
    'settings.parryWin': '弹反判定窗口',
    'settings.dmgMult': '承受伤害倍率',
    'settings.masterVol': '主音量 (Master)',
    'settings.musicVol': '背景配乐 (D 弗里吉亚)',
    'settings.sfxVol': '战斗与环境音效 (SFX)',
    'settings.haptics': '手柄双马达震动',
    'settings.testHaptic': '测试震动',
    'settings.secKeys': '自定义键盘按键（点击键帽后按新键录入，Esc 取消）',
    'settings.resetKeys': '恢复默认',
    'settings.saveClose': '保存并返回',
    'altar.sub': '灯油与魂火已回满 · 提灯可同时铭刻「主印 + 副印」两枚圣物',
    'altar.close': '起身前行',
    'smith.sub': '熄灯铁砧 · 以击杀强敌所得「残响」淬炼断刃与魂炉',
    'smith.echoHold': '✦ 当前持有残响：{0}',
    'smith.close': '收刃告辞',
    'death.title': '灯 火 熄 灭',
    'death.sub': '残破人偶坠入墨蚀深渊',
    'death.retry': '于祭坛重燃',
    'death.retryEcho': '再战回响',
    'victory.closeMap': '收起舆图 [M]',
    'victory.closeLore': '收起残碑',
    'victory.closeHelp': '继续战斗'
  },
  'en-US': {
    'game.title': 'ASHEN BELL VOW',
    'game.subtitle': 'Dark Hand-Drawn Soulslike Metroidvania Prototype',
    'btn.continue': 'Continue Vow',
    'btn.startNew': 'Awaken Puppet',
    'btn.startOverwrite': 'Overwrite Slot {0} & Start',
    'btn.startSlot': 'Awaken in Slot {0}',
    'slot.label': 'Slot {0}',
    'slot.empty': 'Empty',
    'slot.emptyDesc': 'No vow inscribed · Select slot to begin',
    'slot.summary': '{0} · Explored {1}% · Bosses {2}/3',
    'slot.erase': 'Erase',
    'slot.confirmErase': 'Erase all save data in Slot {0}? This cannot be undone.',
    'slot.selectedInfo': 'Slot {0}: {1} · Explored {2}% · Relics {3}/{4}{5}{6}',
    'pause.title': 'VOW PAUSED',
    'pause.sub': 'Slot {0} · Explored {1}% · Time {2}',
    'pause.resume': 'Resume',
    'pause.settings': 'Settings & Audio',
    'pause.respawn': 'Return to Altar',
    'pause.titleBtn': 'Save & Title',
    'hud.soul': 'Soul {0}',
    'hud.flasks': 'Oil',
    'hud.seals': 'Seals',
    'hud.explore': 'Explored {0}%',
    'hud.map': 'Map [M]',
    'hud.help': 'Arts',
    'hud.settings': 'Settings',
    'hud.respawn': 'Altar',
    'hud.muteOn': 'Audio: On',
    'hud.muteOff': 'Audio: Off',
    'hud.ctrlKb': 'Input: K+M',
    'hud.ctrlKey': 'Input: Keys',
    'settings.title': 'Settings & Assist',
    'settings.sub': 'Language · Assist Tuning · Dual Rumble · Custom Keybinds',
    'settings.secAudio': 'Language, Assist & Feedback',
    'settings.lang': 'Language',
    'settings.parryWin': 'Parry Window',
    'settings.dmgMult': 'Damage Taken',
    'settings.masterVol': 'Master Volume',
    'settings.musicVol': 'Music (D Phrygian)',
    'settings.sfxVol': 'Combat & Ambience SFX',
    'settings.haptics': 'Gamepad Rumble',
    'settings.testHaptic': 'Test Rumble',
    'settings.secKeys': 'Keybinds (Click key & press new key, Esc to cancel)',
    'settings.resetKeys': 'Reset Default',
    'settings.saveClose': 'Save & Return',
    'altar.sub': 'Oil & Soul restored · Equip Primary + Secondary relics',
    'altar.close': 'Rise & Venture',
    'smith.sub': 'Extinguished Anvil · Temper blade & furnace with Echoes',
    'smith.echoHold': '✦ Echoes Held: {0}',
    'smith.close': 'Take Leave',
    'death.title': 'LANTERN EXTINGUISHED',
    'death.sub': 'The broken puppet falls into the ink abyss',
    'death.retry': 'Reignite at Altar',
    'death.retryEcho': 'Retry Echo',
    'victory.closeMap': 'Close Map [M]',
    'victory.closeLore': 'Close Tablet',
    'victory.closeHelp': 'Resume Fight'
  }
};

export function getLocale() {
  return (G && G.locale === 'en-US') ? 'en-US' : 'zh-CN';
}

export function t(key, ...args) {
  const loc = getLocale();
  let str = (DICT[loc] && DICT[loc][key]) || DICT['zh-CN'][key] || key;
  for (let i = 0; i < args.length; i++) {
    str = str.replace(`{${i}}`, String(args[i]));
  }
  return str;
}

export function setLocale(loc, persist = true) {
  const next = loc === 'en-US' ? 'en-US' : 'zh-CN';
  if (G) G.locale = next;
  if (persist) storage.set(LOCALE_KEY, next);
  applyStaticI18n();
}

export function loadSavedLocale() {
  const saved = storage.get(LOCALE_KEY);
  setLocale(saved === 'en-US' ? 'en-US' : 'zh-CN', false);
}

export function applyStaticI18n() {
  const mapText = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  };
  mapText('btn-map', 'hud.map');
  mapText('btn-help', 'hud.help');
  mapText('btn-settings', 'hud.settings');
  mapText('btn-respawn', 'hud.respawn');
  mapText('btn-close-settings', 'settings.saveClose');
  mapText('btn-test-haptic', 'settings.testHaptic');
  mapText('btn-reset-keys', 'settings.resetKeys');
  mapText('btn-close-altar', 'altar.close');
  mapText('btn-close-smith', 'smith.close');
  mapText('btn-close-map', 'victory.closeMap');
  mapText('btn-close-lore', 'victory.closeLore');
  mapText('btn-close-help', 'victory.closeHelp');
  mapText('btn-pause-resume', 'pause.resume');
  mapText('btn-pause-settings', 'pause.settings');
  mapText('btn-pause-respawn', 'pause.respawn');
  mapText('btn-pause-title', 'pause.titleBtn');
}
