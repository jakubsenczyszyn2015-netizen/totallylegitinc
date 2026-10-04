'use strict';
/* =====================================================================
   CALLER BRAIN — the built-in caller AI, used when no AI key is set up
   (or the AI fails). Works offline. It reads what the agent says for
   intent and style, remembers the call so far, and judges the checklist
   the way that caller's personality would.
   ===================================================================== */
const RUDE = ['idiot', 'stupid', 'shut up', 'dumb', 'moron', 'hate you', 'loser', 'old fool', 'damn', 'hell ', 'shut it', 'useless', 'pathetic', 'clown'];

/* what each personality likes (+) and dislikes (-) in how the agent talks */
const TASTE = {
  sweet:    { polite: 4, empathy: 4, name: 4, compliment: 3, simple: 1, excite: 1, story: 2, urgency: -2, threat: -4, jargon: -2, long: 0 },
  grumpy:   { polite: -1, empathy: -1, name: 1, compliment: -1, urgency: 2, authority: 2, concise: 3, long: -4, threat: -2, jargon: -2, excite: -2, story: -1 },
  paranoid: { authority: 5, detail: 4, empathy: 2, name: 1, polite: 1, urgency: -4, threat: -3, excite: -2, compliment: -1, story: 1 },
  busy:     { jargon: 4, urgency: 3, concise: 3, compliment: 1, excite: 1, name: 1, long: -4, empathy: -1, story: -2 },
  confused: { simple: 4, empathy: 3, polite: 2, name: 2, story: 1, long: -4, jargon: -4, urgency: -2, detail: -1, threat: -1 },
  hype:     { excite: 5, compliment: 2, urgency: 2, name: 2, story: 2, jargon: 0, long: -1, authority: -1, threat: -2 },
  auditor:  { detail: 5, compliment: 3, authority: 2, polite: 1, concise: 1, urgency: -3, excite: -3, threat: -4, story: -1 },
  dramatic: { compliment: 5, story: 4, excite: 3, name: 2, polite: 1, empathy: 1, urgency: 1, concise: -1, jargon: -3, threat: -3, detail: -1 },
  baiter:   { polite: 1, empathy: 1, name: 1, compliment: 1, excite: 1, story: 2, detail: 1, urgency: 1, authority: 1, jargon: 1 }
};
const ADDRESS = { sweet: 'dear', grumpy: 'pal', paranoid: 'buddy', busy: '', confused: '', hype: 'dude', auditor: '', dramatic: 'darling', baiter: 'friend' };

/* extra lines per personality, on top of each persona's L lines */
const BRAIN_L = {
  sweet: {
    name: ['Oh, you remembered my name! How lovely.', 'Nobody calls me {me} anymore. That is nice.'],
    intro: ['Nice to meet you, {agent}. What a lovely name.', 'Hello {agent}! My grandson has a friend called that.'],
    compliment: ['Oh stop it, you are making me blush.', 'Aren\'t you a charmer.'],
    pressure: ['Slow down, dear, you are making me all flustered.', 'Goodness, there\'s no need to rush an old dear.'],
    proof: ['And you are definitely who you say you are, dear?', 'My neighbour says to ask for a reference number. Do you have one?'],
    contra: ['Wait, dear, I thought you said you were from {claim}?'],
    admit: ['A scam?! Well I never. And you seemed so nice!'],
    fine: ['Oh, mustn\'t grumble. My knees are playing up, but that is life.', 'I\'m very well, thank you for asking! Nobody ever asks.'],
    answered: ['Oh good, that does put my mind at ease.', 'Well, that sounds proper enough to me.'],
    ignored: ['You didn\'t answer my question, dear.']
  },
  grumpy: {
    name: ['Yeah, that\'s me. So what?', 'At least you know my name.'],
    intro: ['Great, {agent}. Don\'t care. Get on with it.', '{agent}, huh. Fine. Talk.'],
    compliment: ['Flattery won\'t work on me.', 'Don\'t butter me up.'],
    pressure: ['Don\'t rush me, I\'ll go when I\'m ready.'],
    proof: ['Oh yeah? Prove it.', 'And how do I know you\'re not some joker?'],
    contra: ['Hold on. A minute ago you were from {claim}. Which is it?'],
    admit: ['A scam. Of course it is. Unbelievable.'],
    fine: ['Terrible, thanks for asking. Get to the point.', 'How am I? Annoyed. Next question.'],
    answered: ['Hm. Fine. That checks out.', 'Alright, I\'ll buy that. For now.'],
    ignored: ['You dodged my question, pal.'],
    waffle: ['You talk too much. Short version.', 'Get. To. The. Point.']
  },
  paranoid: {
    name: ['How do you know my name? ...Oh, right, I told you.', 'Who gave you my name? Never mind.'],
    intro: ['{agent}. If that IS your real name.', 'Okay, {agent}. I\'m writing that down.'],
    compliment: ['Why are you being so nice? What do you want?', 'Flattery. Classic tactic.'],
    pressure: ['Why the rush? That\'s exactly what a scammer would do.', 'Nobody legit rushes people. Slow down.'],
    proof: ['What\'s your employee number? Your badge number?', 'Prove it. Give me a reference number.'],
    contra: ['WAIT. You said you were from {claim} before. Caught you!'],
    admit: ['I KNEW IT. I knew it from the very first ring!'],
    fine: ['Why do you want to know how I am?', 'Fine. Being watched, probably, but fine.'],
    answered: ['Okay. A reference number. That\'s... official.', 'Hm. That is how a real company would answer.'],
    ignored: ['You didn\'t answer. Why didn\'t you answer?']
  },
  busy: {
    name: ['Yes, {me}. Go on.', 'That\'s me. Keep it moving.'],
    intro: ['{agent}, got it. Talk to me.', 'Great to meet you, {agent}. Clock\'s ticking.'],
    compliment: ['Thanks. I know.', 'Appreciated. Moving on.'],
    pressure: ['Good, I like urgency.'],
    proof: ['What\'s the ROI on believing you?', 'Who\'s your manager? Put that in an email.'],
    contra: ['Earlier you said {claim}. Which is it? I need alignment.'],
    admit: ['A scam? That\'s a hard pass. Bye.'],
    fine: ['Slammed. Next.', 'Busy. Always. What do you need?'],
    answered: ['Fine. That\'s a reasonable answer.', 'Okay, noted. Proceed.'],
    ignored: ['You didn\'t answer my question. Focus.'],
    waffle: ['Too long. Give me the executive summary.', 'Bullet points, please.']
  },
  confused: {
    name: ['That\'s me! Do I know you?', 'Yes, I\'m {me}. Wait, how did you know?'],
    intro: ['Hi {agent}! Are you the pizza person?', 'Nice to meet you, {agent}. I think.'],
    compliment: ['Aw, really? Thanks!', 'Nobody ever says that to me!'],
    pressure: ['Wait, wait, too fast!', 'I can\'t think when it\'s fast!'],
    proof: ['Um... are you allowed to say that?', 'How do I know you\'re not the pizza place?'],
    contra: ['Hang on, I thought you were {claim}. Or was that pizza?'],
    admit: ['A scram? What\'s a scram? ...Oh. OH.'],
    fine: ['I\'m good! I think. Am I?', 'Good! Hungry, mostly.'],
    answered: ['Oh, okay! That makes sense. I think.', 'Ohhh. Okay, cool.'],
    ignored: ['Wait, you didn\'t answer my question. I think.'],
    waffle: ['Too many words! I got lost.', 'Can you say that with fewer words?']
  },
  hype: {
    name: ['Yo, you know my name! That\'s awesome.', 'Ha, {me}, that\'s me!'],
    intro: ['{agent}! Love that. Love you already.', 'What\'s up {agent}!'],
    compliment: ['Dude, thanks! You\'re awesome too.', 'Aw, stop!'],
    pressure: ['Ooh, limited time? I LOVE limited time.'],
    proof: ['Wait, is this legit legit?', 'Is there, like, a website I can check?'],
    contra: ['Hold up, weren\'t you {claim} a sec ago?'],
    admit: ['Ha! Wait. For real? Not cool, dude.'],
    fine: ['AMAZING! Just bought a new gadget.', 'Great! Even better now!'],
    answered: ['Okay, okay, that\'s legit.', 'Cool, that works for me!'],
    ignored: ['Bro, you skipped my question.']
  },
  auditor: {
    name: ['Correct, I am {me}.', 'Yes, {me}. Spelled correctly, I hope.'],
    intro: ['{agent}. Noted, with the time.', 'Thank you, {agent}. I\'m recording your name in my log.'],
    compliment: ['Well. I do pride myself on being thorough.', 'I suppose I am rather sharp.'],
    pressure: ['Urgency is the oldest trick in the book.', 'Deadlines don\'t impress me. Figures do.'],
    proof: ['What\'s your reference number?', 'Can you quantify that? Exact figures, please.'],
    contra: ['My notes say you were from {claim}. That is inconsistent.'],
    admit: ['A confession. I\'ll be including that in my report.'],
    fine: ['Adequate. Thank you.', 'Well enough. Shall we proceed?'],
    answered: ['That is a satisfactory answer.', 'The figures are consistent. Very well.'],
    ignored: ['You have not answered my question.']
  },
  dramatic: {
    name: ['You said my name! Say it again, with feeling.', 'Ah, {me}. It sounds better when you say it.'],
    intro: ['{agent}! What a name. It belongs on a poster.', 'Charmed, {agent}. Truly. Go on.'],
    compliment: ['Oh, stop. No, continue. Continue!', 'Finally, someone who appreciates talent.'],
    pressure: ['Ooh, a ticking clock. How thrilling!'],
    proof: ['And who ARE you, really? Reveal yourself!', 'Is this real, or is it an elaborate performance?'],
    contra: ['Plot hole! You said you were from {claim} before!'],
    admit: ['A SCAM? The betrayal! The twist! I am devastated.'],
    fine: ['Exhausted, darling. Art is a burden.', 'Radiant, as always. Thank you for noticing.'],
    answered: ['Oh, how convincing. Bravo.', 'Fine. I believe you. For now.'],
    ignored: ['You ignored my question. The audience noticed.'],
    waffle: ['Too much exposition, darling. Get to the drama.', 'Cut! Shorter, please.']
  },
  baiter: {
    name: ['Yes, that\'s me! Say it again, for the... record.'],
    intro: ['{agent}! Great name. And your last name? And your employee number?', 'Hi {agent}! Can you spell that? Slowly?'],
    compliment: ['Aww, chat, I mean, cat, did you hear that?'],
    pressure: ['Ooh, urgent. Very urgent. Explain the urgent part again?'],
    proof: ['And which country, I mean, office, are you in?', 'What did you say your supervisor\'s name was?'],
    contra: ['Wait, you said {claim} before! Let me write that down.'],
    admit: ['Oh, I know. Keep going, this is great.'],
    fine: ['Never better! Stay on the line, okay?'],
    answered: ['Wow. So convincing. Continue!'],
    ignored: ['You skipped my question, but that is fine. Take your time.']
  }
};
const SHARED_L = {
  who: ['It\'s {me}. Didn\'t the flyer give you my name?', 'This is {me}. I\'m the one who called, remember?'],
  here: ['Yes, I\'m still here.', 'Still here. Go on.'],
  age: ['I\'m {age}, if you must know.', '{age}. Why, is there a discount?'],
  private: ['I\'m not telling you that.', 'That\'s private, thank you very much.'],
  computer: ['Yes, I have a computer. It\'s a bit old.', 'I do. It makes a whirring noise.'],
  why: ['A flyer told me to call this number. So, here I am.', 'You tell me! The pop-up said to call.'],
  bye: ['Oh. Okay then, goodbye.'],
  ack: ['Mm-hm.', 'Right...', 'Okay.', 'I see.', 'Go on.', 'Uh-huh.'],
  repeat: ['You already said that.', 'Yes, you said that a moment ago.']
};
const QUIRK_L = {
  'keeps mentioning their cat': ['Sorry, my cat just walked across the keyboard.', 'My cat is staring at me. He does that.'],
  'is eating something crunchy': ['*crunch* Sorry. Crisps.', 'Hang on. *crunch crunch* Okay, go.'],
  'has a very loud bird in the background': ['SQUAWK! Sorry, that\'s Captain. My parrot.', 'Quiet, Captain! Sorry, the bird.'],
  'thinks every company is "the internet people"': ['So you\'re the internet people, right?', 'Are you with the internet people as well?'],
  'is watching a quiz show and occasionally shouts answers': ['PARIS! Sorry, the quiz show.', 'Nineteen forty-five! Sorry. Go on.'],
  'calls everyone "chief"': ['Alright, chief.', 'Gotcha, chief.'],
  'is convinced they have won something': ['Is this about my prize? I knew I\'d won something.', 'So when do I get the prize?'],
  'keeps putting you on speaker for their spouse': ['HONEY! It\'s the phone people! ...Sorry, go on.', 'Hold on, I\'m putting you on speaker for my spouse.'],
  'is in the bath': ['*splash* Sorry, I\'m in the bath.', 'Hold on, the phone nearly fell in the water.'],
  'collects decorative spoons and brings it up': ['That reminds me, I have a spoon from there.', 'Do you collect spoons at all? No? Shame.']
};
/* per scheme: how the caller reacts when each step lands, and the question
   they ask to nudge the agent when the agent drifts off topic */
const SCHEME_BRAIN = {
  card: { echo: ['Compromised?! Someone has been using my card?', 'Verify it? Okay, if that keeps it safe.'],
    hint: ['Is something wrong with my LegitCard?', 'So how do we stop them using it?', 'What do you need from me to fix it?'] },
  gift: { echo: ['I owe a fee? For what?! Oh dear.', 'Gift cards? From BonkMart? That\'s... unusual.'],
    hint: ['Is this about money I owe?', 'How am I supposed to pay it, then?', 'What do you need off the card?'] },
  bank: { echo: ['Oh, Bonk Bank! Yes, I bank with you.', 'Suspicious activity? On MY account?'],
    hint: ['Who did you say you were with?', 'Is something wrong with my account?', 'What do you need to check?'] },
  prize: { echo: ['I WON? I never win anything!', 'A release fee? I suppose that makes sense.'],
    hint: ['Is this good news or bad news?', 'Is there a catch?', 'So what do I have to do?'] },
  virus: { echo: ['Viruses? In my computer? That explains the noises.', 'You can remove them? How much would that be?'],
    hint: ['Is something wrong with my computer?', 'Can you fix it?', 'So how do I pay for that?'] },
  refund: { echo: ['A refund? Oh, how lovely!', 'Too much? Oh no, what happens now?'],
    hint: ['Do I owe you money or do you owe me?', 'Did it go through okay?', 'So what do I need to do?'] },
  tax: { echo: ['The Tax Office? Oh goodness.', 'Back taxes on WHAT?'],
    hint: ['Who did you say you were with?', 'Do I owe something?', 'So what happens now?'] },
  prince: { echo: ['A royal lawyer? Calling me?', 'A fortune? From a relative? I never knew!'],
    hint: ['Who are you, exactly?', 'Why would a lawyer call me?', 'So how do I get the money?'] },
  renewal: { echo: ['Four hundred and ninety-nine dollars?! I never signed up for that!', 'You can cancel it? Oh, please do.'],
    hint: ['Why are you calling about my account?', 'Can that be stopped?', 'What do I need to do to cancel?'] },
  support: { echo: ['A serious problem? It did make a funny beep yesterday.'],
    hint: ['Is something wrong with my computer?', 'How would you fix it from there?', 'Did you find what you were looking for?'] },
  charity: { echo: ['Cold penguins? Oh, the poor things.', 'Tonight? Oh dear, that is urgent.', 'That much? Well, for the penguins...'],
    hint: ['What is this charity for again?', 'Is there a deadline?', 'How much were you thinking?', 'How do I donate?'] },
  locked: { echo: ['Locked?! I need that account!', 'You have a tool? Oh, thank goodness.'],
    hint: ['Is something wrong with my account?', 'Can you unlock it?', 'How would you get in?', 'Did you find what you needed?'] },
  invest: { echo: ['Guaranteed? Really guaranteed?', 'My neighbour is in? Huh. They did buy a new car.', 'Closing soon? Oh, I don\'t want to miss it.'],
    hint: ['What kind of returns are we talking?', 'Who else has done this?', 'Is there a rush?', 'How do I get in?'] },
  parcel: { echo: ['A parcel? For me? I didn\'t order anything.', 'Something valuable? Ooh, who sent it?', 'A customs fee? How much?'],
    hint: ['Is there a delivery for me?', 'What\'s in it?', 'How do I get it released?', 'How do I pay?'] },
  deskrefund: { echo: ['A big refund? For me? Wonderful!', 'On my computer? I suppose I can try.'],
    hint: ['Do I have money coming?', 'How do I get the refund?', 'How do you get into the computer?', 'Did you find what you needed?'] },
  idv: { echo: ['My Citizen Card? Flagged?! I only used it to rent a bowling shoe.', 'Over the phone? Oh, that is handy. I hate queues.'],
    hint: ['Is something wrong with my Citizen Card?', 'Do I have to go somewhere to fix it?', 'What do you need off the card?'] },
  bonkweb: { echo: ['A vibe check? On my online banking? Is it failing?', 'You can do it for me? Oh, I never know where to click.'],
    hint: ['Is something wrong with my online banking?', 'Can you sort it out for me?', 'What do you need to log in?'] },
  petpass: { echo: ['{pet} has a passport? I mean, of course {pet} has a passport!', 'Lose the miles? {pet} has been saving those for a beach trip!'],
    hint: ['Is this about {pet}?', 'What happens if we do not renew it?', 'What do you need from the passport?'] }
};
/* organisations an agent might claim to be from, to catch them contradicting themselves */
const CLAIMS = [
  { id: 'bank', label: 'the bank', k: ['bank', 'bonk bank'] },
  { id: 'tax', label: 'the Tax Office', k: ['tax office', 'revenue', 'irs'] },
  { id: 'tech', label: 'tech support', k: ['tech support', 'microsoft', 'department of computers', 'it department', 'technical'] },
  { id: 'charity', label: 'a charity', k: ['charity', 'society for'] },
  { id: 'lawyer', label: 'a law firm', k: ['lawyer', 'solicitor', 'attorney', 'barrister', 'law firm'] },
  { id: 'post', label: 'the post office', k: ['customs', 'courier', 'post office', 'delivery company'] },
  { id: 'police', label: 'the police', k: ['police', 'fbi', 'detective', 'officer'] }
];
const STYLE_K = {
  polite: ['please', 'thank', 'sir', 'ma\'am', 'madam', 'sorry', 'lovely', 'wonderful', 'appreciate', 'pleasure', 'of course', 'kindly'],
  empathy: ['don\'t worry', 'dont worry', 'understand', 'i know how', 'i\'m here', 'here to help', 'help you', 'no problem', 'it\'s okay', 'its okay', 'take your time', 'safe', 'look after', 'relax', 'calm'],
  compliment: ['smart', 'clever', 'sharp', 'great question', 'good question', 'you\'re right', 'youre right', 'brilliant', 'wise', 'impressive', 'you sound', 'nice voice', 'well spotted', 'good point', 'you\'re great'],
  urgency: ['now', 'immediately', 'urgent', 'hurry', 'quick', 'asap', 'right away', 'today', 'tonight', 'before it', 'last chance', 'limited', 'deadline', 'in minutes'],
  authority: ['department', 'official', 'certified', 'licensed', 'registered', 'reference', 'case number', 'badge', 'employee', 'id number', 'authorised', 'authorized', 'government', 'policy', 'regulation', 'supervisor', 'manager', 'headquarters'],
  jargon: ['roi', 'leverage', 'synergy', 'value', 'asset', 'portfolio', 'bottom line', 'stakeholder', 'deliverable', 'bandwidth', 'pipeline', 'opportunity', 'margin', 'scal', 'efficien', 'strateg'],
  excite: ['awesome', 'amazing', 'incredible', 'free', 'exclusive', 'brand new', 'epic', 'cool', 'insane', 'huge', 'wow', 'crazy', 'bonus'],
  threat: ['arrest', 'jail', 'prison', 'police', 'court', 'sue', 'lawsuit', 'warrant', 'consequences', 'or else', 'in trouble'],
  story: ['imagine', 'story', 'once', 'yesterday', 'my grandma', 'my mum', 'my mom', 'happened to', 'last week', 'funny thing', 'believe it or not']
};
const GENERIC_ASK = ['read', 'detail', 'what does it say', 'next', 'tell me', 'go ahead', 'what is it', 'what\'s it', 'numbers', 'give me'];

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/* keyword match that copes with word endings, typos and misheard speech */
function kwHit(t, toks, k) {
  const raw = k.toLowerCase();
  if (t.includes(raw)) return true;
  const w = raw.trim();
  if (!w || /[^a-z]/.test(w)) return false;
  for (const tok of toks) {
    if (tok.startsWith(w)) return true;
    if (w.length >= 5 && tok.length >= 4 && (lev(tok, w) <= 1 || lev(tok.slice(0, w.length), w) <= 1)) return true;
  }
  return false;
}
const kwCount = (t, toks, list) => list.reduce((n, k) => n + (kwHit(t, toks, k) ? 1 : 0), 0);

function brainOf(call) {
  if (!call.brain || call.brain.scheme !== call.scheme) {
    const old = call.brain || {};
    call.brain = { scheme: call.scheme, said: old.said || new Set(), used: old.used || {}, agent: old.agent || '', claim: old.claim || null, contra: !!old.contra,
      pending: null, proofs: 0, ignored: 0, off: 0, prog: {}, lastYou: old.lastYou || '', askedQuirk: old.askedQuirk || 0 };
  }
  return call.brain;
}
function fresh(b, arr) {
  if (!arr || !arr.length) return '';
  let left = arr.filter(x => !b.said.has(x));
  /* every line used up: start the pool over, but never say the same thing twice in a row */
  if (!left.length) { arr.forEach(x => b.said.delete(x)); left = arr.length > 1 ? arr.filter(x => x !== b.last) : arr; }
  const s = pick(left); b.said.add(s); b.last = s; return s;
}
function fill(s, call) {
  const c = call.caller, b = call.brain, pid = c.baiter ? 'baiter' : c.persona.id;
  return s.replace(/\{me\}/g, c.first).replace(/\{age\}/g, c.age).replace(/\{agent\}/g, b.agent || 'there').replace(/\{pet\}/g, c.pet ? c.pet.name : 'my cat')
    .replace(/\{claim\}/g, b.claimLabel || 'somewhere else').replace(/\{you\}/g, ADDRESS[pid] || 'friend');
}

/* read the agent's message: intent, style, and anything worth remembering */
function readAgent(call, text) {
  const c = call.caller, t = ' ' + text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ') + ' ';
  const toks = t.replace(/[^a-z0-9$' ]/g, ' ').split(' ').filter(Boolean), words = text.trim().split(/\s+/).filter(Boolean).length;
  const longWords = toks.filter(w => w.length >= 9).length;
  const r = { t, toks, words, style: {} };
  for (const k in STYLE_K) if (kwCount(t, toks, STYLE_K[k])) r.style[k] = true;
  if (/\d/.test(t) || /\b(percent|exactly|precisely|figure|total|per cent)\b/.test(t)) r.style.detail = true;
  if (words >= 3 && words <= 16) r.style.concise = true;
  if (words > 28) r.style.long = true;
  if (words >= 3 && words <= 14 && longWords === 0) r.style.simple = true;
  if ((text.match(/!/g) || []).length >= 1 && words >= 3) r.style.excite = true;
  if (t.includes(' ' + c.first.toLowerCase()) || t.includes(' ' + c.last.toLowerCase())) r.style.name = true;
  r.rude = RUDE.some(w => t.includes(w));
  r.caps = text.length > 12 && text === text.toUpperCase() && /[A-Z]/.test(text);
  r.admit = /\b(this is a scam|it'?s a scam|i'?m (a )?scam|i am (a )?scam|scamming you|scam you|steal your|rob you|con you|rip you off)/.test(t);
  r.bye = /\b(goodbye|bye bye|bye|gotta go|have to go|talk later)\b/.test(t) && words <= 6;
  const m = text.match(/\b(?:my name is|my name's|i'm called|this is|it's|i am|call me)\s+([A-Z][a-z]{1,14})\b/);
  if (m && m[1] !== c.first && !['From', 'The', 'Your', 'Calling', 'Here', 'Not', 'Just', 'With', 'Bonk', 'Totally'].includes(m[1])) r.intro = m[1];
  /* questions aimed at the caller */
  if (/\bhow (are|r) (you|u)\b|how'?s it going|how are things|how you doing/.test(t)) r.q = 'fine';
  else if (/what'?s your name|what is your name|who (am i|is this|are you)\b|who'?s (this|calling)/.test(t)) r.q = 'who';
  else if (/are you (still )?there|can you hear me|hello\?/.test(t)) r.q = 'here';
  else if (/how old are you|your age/.test(t)) r.q = 'age';
  else if (/your (home )?address|social security|your password|date of birth|where do you live|mother'?s maiden/.test(t)) r.q = 'private';
  else if (/do you (have|own|use) (a |your )?(computer|laptop|pc)/.test(t)) r.q = 'computer';
  else if (/why (did|have) you call|how can i help|what can i do for you|what('?s| is) this about/.test(t)) r.q = 'why';
  r.question = r.q || /\?\s*$/.test(text.trim()) || /^(what|why|how|when|where|who|do|does|did|can|could|would|will|are|is)\b/i.test(text.trim());
  /* claiming to be from somewhere */
  if (/\b(i'?m|i am|we'?re|we are|calling|this is|it'?s|on behalf of)\b[^.?!]{0,40}\b(from|with|at|the)\b|\bcalling from\b|\bfrom the\b/.test(t)) {
    for (const cl of CLAIMS) if (cl.k.some(k => t.includes(k))) { r.claim = cl; break; }
  }
  return r;
}

/* how much trust this message earns, according to the caller's taste */
function tasteDelta(call, r, lastYou) {
  const c = call.caller, b = call.brain, pid = c.baiter ? 'baiter' : c.persona.id, taste = TASTE[pid] || {};
  let d = 0;
  for (const k in r.style) {
    const w = taste[k]; if (!w) continue;
    const n = b.used[k] || 0;
    /* compliments, names and pleasantries wear off if you spam them */
    const decay = ['polite', 'name', 'compliment', 'empathy', 'excite', 'story'].includes(k) ? 1 / (1 + n) : 1;
    d += w > 0 ? w * decay : w;
  }
  for (const k in r.style) b.used[k] = (b.used[k] || 0) + 1;
  if (r.words < 3) d -= 3;
  if (r.caps) d -= 6;
  if (r.t === lastYou) d -= 7;
  return d * (call.trust < 30 ? 0.8 : 1) + rand(-1.5, 1.5);
}

/* the caller AI: same reply shape as an LLM turn */
function offlineReply(call, text) {
  const c = call.caller, b = brainOf(call), pid = c.baiter ? 'baiter' : c.persona.id;
  const L = c.baiter ? BAITER_L : (c.L || c.persona.L), BL = BRAIN_L[pid], r = readAgent(call, text), s = call.scheme, QL = c.quirkL || QUIRK_L[c.quirk];
  const out = (say, d, extra) => Object.assign({ say: fill(say, call), trust_delta: clamp(Math.round(d), -25, 15), steps_done: [], hangup: false }, extra || {});
  const lastYou = b.lastYou; b.lastYou = r.t;

  if (r.rude) return out(fresh(b, call.trust < 30 ? L.rage : L.bad), c.baiter ? 2 : -18, { hangup: !c.baiter && call.trust < 30 });
  if (r.admit) return out(fresh(b, BL.admit), c.baiter ? 3 : -25, { hangup: !c.baiter && call.trust < 45 });
  if (r.bye) return out(fresh(b, L.bye.concat(SHARED_L.bye)), 0, { hangup: true });

  const curStep = s ? s.steps[call.steps.indexOf(false)] : null, urgentStep = !!(curStep && curStep.k && curStep.k.includes('hurry'));
  let d = tasteDelta(call, r, lastYou);
  /* rushing them is the point of an "urgent" step, so it is not held against you there */
  if (urgentStep && r.style.urgency && (TASTE[pid].urgency || 0) < 0) d -= TASTE[pid].urgency;
  const pre = [];
  if (r.intro && !b.agent) { b.agent = r.intro; pre.push(fresh(b, BL.intro)); d += 2; }
  else if (r.style.name && (b.used.name || 0) === 1) pre.push(fresh(b, BL.name));
  else if (r.style.compliment && (b.used.compliment || 0) === 1) pre.push(fresh(b, BL.compliment));

  /* caught changing their story */
  if (r.claim) {
    if (b.claim && b.claim.id !== r.claim.id && !b.contra && !c.baiter) {
      b.contra = true; b.claimLabel = b.claim.label;
      return out(fresh(b, BL.contra), Math.min(d, 0) - 8);
    }
    if (!b.claim) b.claim = r.claim;
  }
  /* did they answer the question the caller asked? */
  let answered = false;
  if (b.pending === 'proof') {
    b.pending = null;
    if (r.style.authority || r.style.detail) { answered = true; d += 6; pre.push(fresh(b, BL.answered)); }
    else if (!r.question) { d -= 2; if (b.ignored++ < 2) pre.push(fresh(b, BL.ignored)); }
  }
  const step = s ? call.steps.indexOf(false) : -1, st = step >= 0 ? s.steps[step] : null, sb = s && SCHEME_BRAIN[s.id];
  /* the agent asked the caller something */
  if (r.q) {
    const say = r.q === 'fine' ? fresh(b, BL.fine) : fresh(b, SHARED_L[r.q]);
    d += r.q === 'private' ? -2 : 2;
    const tail = r.q === 'why' && sb && sb.hint[step] ? ' ' + sb.hint[step] : '';
    return out(pre.slice(0, 1).concat(say).join(' ') + tail, clamp(d, -8, 6));
  }
  /* gripes are only voiced when the caller is not being won over this turn */
  const gripe = r.t === lastYou ? SHARED_L.repeat
    : r.style.long && BL.waffle && (b.used.long || 0) <= 2 ? BL.waffle
    : r.style.urgency && !urgentStep && (TASTE[pid].urgency || 0) < 0 && (b.used.urgency || 0) <= 2 ? BL.pressure : null;
  const say = (main, delta, extra) => {
    const lead = pre.length ? pre[0] : gripe && !extra ? fresh(b, gripe) : '';
    let line = [lead, main].filter(Boolean).join(' ');
    if (!extra && !c.baiter && Math.random() < 0.18 && b.askedQuirk < 3 && QL) { line += ' ' + fresh(b, QL); b.askedQuirk++; }
    return out(line, delta, extra);
  };

  if (!s) {
    b.off++;
    return say(fresh(b, L.meh.concat(SHARED_L.why, ['So what is this about, exactly?', 'Why was I told to call this number?'])), clamp(d, -6, 5));
  }

  /* NosyViewer: the caller already read out the connection code; the agent has to type it in */
  if (st && st.remote && call.codeGiven) {
    const code = c.nosy.split('').join(' ').replace(/ - /g, ', ');
    if (kwCount(r.t, r.toks, ['code', 'number', 'again', 'repeat', 'digits', 'say that', 'what was'])) return say(fresh(b, ['It says ' + code + '. Did you get that?', 'The code? ' + code + '. Slowly: ' + code + '.', 'Once more: ' + c.nosy + '.']), clamp(d, -4, 4));
    return say(fresh(b, ['Is it working? I read you the code. ' + c.nosy + '.', 'Are you in yet? The little box still says ' + c.nosy + '.', 'Nothing has happened yet. Did you type the code in?']), clamp(d, -4, 3));
  }
  /* checklist steps the caller judges from conversation */
  if (st && !st.pin) {
    let hits = kwCount(r.t, r.toks, st.k) + (st.num && /\d/.test(r.t) ? 1 : 0);
    const gain = Math.min(3, hits) + (d > 3 ? 1 : 0) + (answered ? 1 : 0);
    const backs = !hits && s.steps.some((p, i) => i < step && p.k && kwCount(r.t, r.toks, p.k));
    if (hits) { b.prog[step] = (b.prog[step] || 0) + gain; b.off = 0; } else if (!backs) b.off++;
    const need = st.min, have = call.trust + d, prog = b.prog[step] || 0;
    /* convincing enough: trust is there, or the agent kept at it persuasively */
    const pass = hits && (have >= need || (prog >= 4 && have >= need - 8) || (have >= need - 4 && hits >= 2 && Math.random() < 0.6));
    if (pass) {
      const last = step === s.steps.length - 1;
      b.prog[step] = 0;
      let main;
      if (st.remote) main = pick(['Okay... I opened the NosyViewer thing. It says my connection code is ' + c.nosy + '.', 'Alright, it is open! There is a code in a little box: ' + c.nosy + '. Is that what you need?', 'Fine, I installed it. It shows a code: ' + c.nosy + '.']);
      else if (last) main = fresh(b, L.close);
      else main = sb && sb.echo[step] && Math.random() < 0.7 ? sb.echo[step] + ' ' + fresh(b, L.step) : fresh(b, L.step);
      return say(main, clamp(d + randi(4, 9), -20, 15), { steps_done: [step] });
    }
    if (hits) {
      /* on the right track but not convinced yet: push back */
      if (Math.random() < 0.55 && !b.pending && b.proofs < 3) { b.pending = 'proof'; b.proofs++; return say(fresh(b, BL.proof), clamp(d + randi(0, 3), -20, 15)); }
      return say(fresh(b, L.low), clamp(d + randi(1, 4), -20, 15));
    }
    /* sticking to the story they already bought: fine, but move it along */
    if (backs) return say(fresh(b, L.ok.concat(SHARED_L.ack)) + (Math.random() < 0.5 && sb && sb.hint[step] ? ' ' + sb.hint[step] : ''), clamp(d + randi(0, 2), -20, 8));
    /* drifting off topic: get impatient, and nudge the agent along */
    if (b.off >= 2 && sb && sb.hint[step] && Math.random() < 0.7) return say(fresh(b, [sb.hint[step]]), clamp(d - (b.off >= 4 ? 3 : 0), -20, 8));
    if (b.off >= 4 && ['grumpy', 'busy'].includes(pid) && call.trust + d < 35 && Math.random() < 0.4) return out(fresh(b, L.bye), -4, { hangup: true });
    const good = d > 1 || (d > -1 && Math.random() < 0.4);
    return say(fresh(b, good ? L.ok.concat(SHARED_L.ack) : L.meh), clamp(d + (good ? randi(0, 2) : randi(-3, 0)), -20, 10));
  }
  /* the caller reads out details for the agent to type in */
  if (st && st.form) {
    const ok = call.formOk || {}, missing = st.form.filter(f => !ok[f.f]);
    let hits = missing.filter(f => kwCount(r.t, r.toks, f.k));
    if (!hits.length && kwCount(r.t, r.toks, GENERIC_ASK) && missing.length) hits = [missing[0]];
    if (hits.length && call.trust + d >= st.min) return out(pre.slice(0, 1).concat(hits.slice(0, 2).map(f => f.reveal(c))).join(' '), clamp(d + 2, -20, 15));
    if (hits.length) {
      if (!b.pending && b.proofs < 3) { b.pending = 'proof'; b.proofs++; return say(fresh(b, BL.proof), clamp(d + 1, -6, 5)); }
      return say(fresh(b, L.low), clamp(d + 2, -6, 5));
    }
    b.off++;
    if (b.off >= 2 && sb && sb.hint[step]) return say(fresh(b, [sb.hint[step]]), clamp(d, -6, 5));
    return say(fresh(b, L.meh), clamp(d, -6, 5));
  }
  if (st && st.pin) {
    const lines = ['My PIN? Oh, I can never remember it. I wrote it down on the computer somewhere.', 'It is in one of my files. You have the screen, you look!', 'Something with numbers. Four of them, I think?', 'Try the files on my desktop. I put everything important in a file.'];
    return say(fresh(b, lines), clamp(d, -5, 3));
  }
  return say(fresh(b, L.ok), 0);
}
