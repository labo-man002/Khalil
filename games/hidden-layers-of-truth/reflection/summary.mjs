import { chapter } from '../content/chapter.mjs';

export const interpretationLabel = event =>
  chapter[event.sceneId].options.find(item => item.id === event.interpretation).label;

export function summarize(state) {
  const [opening, before, after] = state.judgments;
  const added = after.evidence.filter(id => !before.evidence.includes(id));
  const changed = before.interpretation !== after.interpretation;
  let update;
  if (after.interpretation === 'moved') {
    update = changed
      ? 'بعد الكشف، رجّحت تبديل البند. النسخة الأولى كانت تورّيك فرق في سطر، والكشف ورّاك وين بقى المبلغ.'
      : 'بقيت على فرضيّة تبديل البند. في المرّة الثانية ولّى عندك كشف ووصل يسندوا نفس التفسير.';
  } else if (after.interpretation === 'missing') {
    update = 'في المراجعة رجّحت خروج المبلغ. الكشف اللي شفتو ورّى إنّ المبلغ بقى في الحساب.';
  } else {
    update = 'خلّيت الحكم معلّق بعد الكشف. الدليل وضّح حركة المبلغ، وحكاية التوثيق والمسؤولية بقات سؤال آخر.';
  }

  const passedRumor = state.actions.rumor === 'share';
  const askedWitness = state.actions.adamReply === 'witness';
  return { opening, before, after, added, update, passedRumor, askedWitness };
}

export const outcomes = {
  correct: {
    title: 'قدّام نفس الناس',
    consequence: 'المتطوّعين سمعوا التصحيح، والتقرير خرج بالملحق الممضي.',
  },
  internal: {
    title: 'في عهدة اللجنة',
    consequence: 'الوثائق عند اللجنة والتقرير موقوف. الناس اللي سمعت اسمك ما وصلهاش توضيح جماعي.',
  },
  post: {
    title: 'سبق الكلام',
    consequence: 'النسخ خرجت من الغروب قبل ردّ اللجنة. التصحيح ما وصلش لكلّ اللي شافوا التصويرة، والتقرير مازال موقوف.',
  },
};
