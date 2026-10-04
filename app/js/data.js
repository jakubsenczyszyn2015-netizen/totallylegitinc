'use strict';
/* =====================================================================
   DATA — schemes, callers, boss
   ===================================================================== */
const K_PRICE = ['$', 'dollar', 'price', 'cost', 'fee', 'buck', 'month', 'only', 'just', 'cheap', 'discount', 'offer', 'pound', 'euro'];
const K_CLOSE = ['buy', 'deal', 'sign', 'order', 'purchase', 'confirm', 'card', 'pay', 'today', 'sold', 'shall we', 'go ahead'];
const K_PAY = ['pay', 'card', 'transfer', 'send', 'confirm', 'today', 'wire', 'payment', 'go ahead', 'deal', 'right now'];
const K_REMOTE = ['nosyviewer', 'nosy', 'remote', 'computer', 'access', 'install', 'open', 'connect', 'screen', 'download'];
const STEP_REMOTE = { t: 'Get them to let you into their computer with NosyViewer', k: K_REMOTE, min: 50, remote: true };
const STEP_PIN = { t: 'Find their customer PIN in NosyViewer and enter it below', pin: true };

/* details the caller reads out and the player types into a form */
const F = {
  card: { f: 'card', label: 'Card number', ph: '0000 0000', len: 12, say: 'LegitCard number', k: ['number', 'long', 'front', 'digits', 'details'], reveal: c => 'The long number on the front is ' + c.card + '.' },
  exp: { f: 'exp', label: 'Expiry (MM/YY)', ph: 'MM/YY', len: 5, say: 'card expiry date', k: ['expir', 'date', 'valid', 'details'], reveal: c => 'It expires ' + c.exp + '.' },
  cvc: { f: 'cvc', label: '3-digit code on the back', ph: '000', len: 5, say: '3-digit code on the back of the card', k: ['code', 'back', 'three', 'security', 'cvc', 'cvv'], reveal: c => 'The little numbers on the back are ' + c.cvc.split('').join(' ') + '.' },
  gift: { f: 'gift', label: 'Gift card code', ph: 'BONK-XXXX-XXXX', len: 16, say: 'BonkMart gift card code', k: ['code', 'read', 'number'], reveal: c => 'The code on the card says ' + c.gift + '.' },
  giftpin: { f: 'giftpin', label: 'Scratch-off PIN', ph: '0000', len: 6, say: 'gift card scratch-off PIN', k: [' pin', 'scratch', 'silver', 'under'], reveal: c => 'I scratched off the silver bit. The PIN is ' + c.giftpin.split('').join(' ') + '.' },
  acct: { f: 'acct', label: 'Account number', ph: '000 000', len: 9, say: 'Bonk Bank account number', k: ['account number', 'number'], reveal: c => 'My account number is ' + c.acct + '.' },
  bankpin: { f: 'bankpin', label: 'Card PIN', ph: '0000', len: 6, say: 'bank card PIN', k: [' pin'], reveal: c => 'My PIN? Well, since you are the bank. It is ' + c.bankpin.split('').join(' ') + '.' },
  otp: { f: 'otp', label: 'Code from the text message', ph: '000000', len: 8, say: 'six-digit code the bank just texted you', k: ['code', 'text', 'message', 'sms'], reveal: c => 'Oh, my phone just buzzed. The text says ' + c.otp.split('').join(' ') + '.' }
};
const SCHEMES = [
  { id: 'card', name: 'Credit Card', emoji: '💳', color: '#0ea5a4', unlock: 1, reward: 400,
    pitch: 'Tell the caller their LegitCard has been "compromised", then "verify" every detail on it to "secure" it.',
    steps: [
      { t: 'Convince them their card has been compromised', k: ['compromis', 'stolen', 'hack', 'fraud', 'suspicious', 'breach', 'leak', 'security'], min: 30 },
      { t: 'Offer to secure the card by "verifying" it', k: ['verify', 'secure', 'protect', 'confirm', 'safe', 'check'], min: 40 },
      { t: 'Get their card number, expiry and back code, and type them into the form', pin: true, min: 48, form: [F.card, F.exp, F.cvc], btn: 'Process payment' }],
    tips: ['Someone used their card to buy 900 kazoos. Shocking.', 'Ask for one detail at a time and type as they read.'] },
  { id: 'gift', name: 'Gift Cards', emoji: '🎁', color: '#f97316', unlock: 1, reward: 350,
    pitch: 'Tell the caller they owe a ridiculous fee that can only be paid in BonkMart gift cards.',
    steps: [
      { t: 'Convince them they owe a silly fee', k: ['fee', 'fine', 'owe', 'overdue', 'tax', 'bill', 'debt', 'charge'], min: 30 },
      { t: 'Explain it can only be paid in BonkMart gift cards', k: ['gift', 'bonkmart', 'voucher', 'card', 'store', 'shop'], min: 42 },
      { t: 'Get the gift card code and the scratch-off PIN, and type them into the form', pin: true, min: 50, form: [F.gift, F.giftpin], btn: 'Redeem gift card' }],
    tips: ['The fee is for a library book overdue since 1987.', 'Serious institutions only accept gift cards. Like the Moon.'] },
  { id: 'bank', name: 'Bank Security', emoji: '🏦', color: '#1d4ed8', unlock: 1, reward: 550,
    pitch: 'Pose as Bonk Bank\'s Department of Extremely Real Security and "verify" the caller\'s account.',
    steps: [
      { t: 'Convince them you are calling from their bank', k: ['bank', 'bonk', 'security', 'department'], min: 35 },
      { t: 'Alarm them about suspicious activity on the account', k: ['suspicious', 'activity', 'unusual', 'fraud', 'purchase', 'duck', 'stolen', 'hack', 'someone'], min: 45 },
      { t: 'Get their account number, card PIN and text message code, and type them into the form', pin: true, min: 52, form: [F.acct, F.bankpin, F.otp], btn: 'Verify account' }],
    tips: ['Someone just bought 400 rubber ducks on their account. Probably.', 'The text code "proves it is really them". Obviously.'] },
  { id: 'prize', name: 'Prize Winner', emoji: '🏆', color: '#f59e0b', unlock: 1, reward: 150,
    pitch: 'Tell the caller they have won a prize in a contest they never entered. They only have to pay the "release fee".',
    steps: [
      { t: 'Tell them they have won something amazing', k: ['won', 'win', 'prize', 'winner', 'congrat', 'lottery', 'jackpot'], min: 25 },
      { t: 'Explain the "release fee"', k: ['fee', 'release', 'processing', 'tax', 'customs', 'shipping', 'handling'], min: 35 },
      { t: 'Get them to agree to pay it', k: K_PAY, min: 45 }],
    tips: ['The prize is a jet ski. Or a goat. Stay vague.', 'They never entered? Even better, it was a surprise draw.'] },
  { id: 'virus', name: 'Virus Alert', emoji: '🦠', color: '#22c55e', unlock: 1, reward: 200,
    pitch: 'You are from the Department of Computers. Their computer is "full of viruses" and only you can remove them, for a fee.',
    steps: [
      { t: 'Convince them their computer is infected', k: ['virus', 'infect', 'malware', 'hack', 'error', 'slow', 'computer'], min: 25 },
      { t: 'Offer to remove the viruses for a fee', k: ['remove', 'fix', 'clean', 'repair', 'fee', 'price', '$', 'cost'], num: true, min: 35 },
      { t: 'Get them to agree to pay', k: K_PAY, min: 45 }],
    tips: ['Count the viruses out loud. Forty-seven is a good number.', 'No computer? Then the viruses are in the toaster.'] },
  { id: 'refund', name: 'Refund Oops', emoji: '💸', color: '#06b6d4', unlock: 1, reward: 250,
    pitch: 'Tell them they are owed a refund, "accidentally" send too much, then ask them to send the difference back.',
    steps: [
      { t: 'Tell them they are owed a refund', k: ['refund', 'owed', 'money back', 'overcharg', 'reimburse'], min: 30 },
      { t: '"Accidentally" refund far too much', k: ['accident', 'too much', 'mistake', 'extra', 'oops', 'typo', 'zero', 'wrong amount'], min: 40 },
      { t: 'Get them to send the difference back', k: ['send', 'back', 'return', 'difference', 'transfer', 'pay'], min: 50 }],
    tips: ['Gasp loudly when you "notice" the extra zero.', 'Your boss will be SO angry. That part is true.'] },
  { id: 'tax', name: 'Tax Office', emoji: '🧾', color: '#8b7bff', unlock: 2, reward: 300,
    pitch: 'You are from the Tax Office. They owe back taxes on something absurd, and it is due today.',
    steps: [
      { t: 'Convince them you are from the Tax Office', k: ['tax', 'office', 'revenue', 'government', 'department', 'official', 'agent'], min: 30 },
      { t: 'Tell them what they owe back taxes on', k: ['owe', 'unpaid', 'back tax', 'overdue', 'audit', 'penalty', 'bill'], min: 40 },
      { t: 'Get them to agree to pay today', k: K_PAY, min: 50 }],
    tips: ['They owe tax on breathing premium air.', 'Late payers get a visit from the Tax Goose.'] },
  { id: 'prince', name: 'Royal Inheritance', emoji: '👑', color: '#facc15', unlock: 2, reward: 350,
    pitch: 'A distant royal relative has left them a fortune. A small "transfer fee" unlocks it.',
    steps: [
      { t: 'Introduce yourself as a royal lawyer', k: ['lawyer', 'barrister', 'attorney', 'royal', 'prince', 'king', 'estate', 'solicitor'], min: 30 },
      { t: 'Tell them about the fortune they inherited', k: ['inherit', 'fortune', 'million', 'relative', 'heir', 'gold'], min: 42 },
      { t: 'Get them to pay the transfer fee', k: ['fee', 'transfer', 'unlock', 'release', 'processing', 'pay'], min: 52 }],
    tips: ['Their great-uncle was Prince of a roundabout.', 'The fortune is in gold. And one horse.'] },
  { id: 'renewal', name: 'Subscription Renewal', emoji: '🔁', color: '#38bdf8', unlock: 3, reward: 400,
    pitch: 'Their "Mega Antivirus Deluxe" has auto-renewed for $499. You can "cancel" it, for a cancellation fee.',
    steps: [
      { t: 'Tell them about the renewal charge', k: ['renew', 'subscription', 'charged', 'antivirus', '499', 'billed'], min: 32 },
      { t: 'Offer to cancel it for them', k: ['cancel', 'refund', 'stop', 'reverse', 'undo'], min: 44 },
      { t: 'Get the "cancellation fee" paid', k: ['fee', 'pay', 'card', 'confirm', 'transfer'], min: 54 }],
    tips: ['They never signed up? That is why it is so urgent.', 'The cancellation fee is smaller than $499. Bargain.'] },
  { id: 'support', name: 'Tech Support', emoji: '🖥️', color: '#f472b6', unlock: 3, reward: 450,
    pitch: 'Their computer is "sending error signals". Get in with NosyViewer and dig out their customer PIN.',
    steps: [
      { t: 'Convince them their computer has a serious problem', k: ['computer', 'error', 'signal', 'virus', 'hack', 'problem', 'warning'], min: 32 },
      STEP_REMOTE, STEP_PIN],
    tips: ['Ask them to read out any number on screen. Sigh heavily.', 'You must "see the problem" through NosyViewer.'] },
  { id: 'charity', name: 'Fake Charity', emoji: '🐧', color: '#fb923c', unlock: 4, reward: 500,
    pitch: 'Collect donations for the Society for Slightly Cold Penguins. The penguins will never see a penny.',
    steps: [
      { t: 'Tug at their heartstrings', k: ['penguin', 'charity', 'cold', 'help', 'poor', 'sad', 'suffer', 'donat'], min: 30 },
      { t: 'Make it urgent', k: ['urgent', 'today', 'tonight', 'deadline', 'last', 'running out', 'hurry', 'now'], min: 45 },
      { t: 'Suggest a donation amount', k: K_PRICE, num: true, min: 52 },
      { t: 'Get them to agree to pay', k: K_PAY, min: 58 }],
    tips: ['Each donation buys one penguin a tiny scarf.', 'Describe a specific penguin. His name is Gerald.'] },
  { id: 'locked', name: 'Account Recovery', emoji: '🔐', color: '#e879f9', unlock: 4, reward: 550,
    pitch: 'Their "internet account" has been locked. Only you can unlock it, from inside their computer.',
    steps: [
      { t: 'Tell them their account has been locked', k: ['locked', 'account', 'suspend', 'block', 'disabled', 'frozen'], min: 32 },
      { t: 'Explain that you have the unlocking tool', k: ['unlock', 'tool', 'fix', 'restore', 'recover'], min: 44 },
      STEP_REMOTE, STEP_PIN],
    tips: ['Which account? All of them. The whole internet.', 'The unlocking tool only works through NosyViewer.'] },
  { id: 'invest', name: 'Investment Tip', emoji: '📈', color: '#ef4444', unlock: 5, reward: 600,
    pitch: 'A "guaranteed" investment in DuckCoin. It only goes up. Mostly.',
    steps: [
      { t: 'Promise guaranteed returns', k: ['guarantee', 'return', 'profit', 'double', 'invest', 'rich'], min: 34 },
      { t: 'Name-drop people who are already in', k: ['neighbour', 'neighbor', 'celebrity', 'everyone', 'friend', 'famous', 'already'], min: 46 },
      { t: 'Create urgency: the window is closing', k: ['limited', 'today', 'last', 'closing', 'hurry', 'soon', 'before'], min: 54 },
      { t: 'Get them to invest', k: K_PAY.concat(['invest', 'buy']), min: 60 }],
    tips: ['DuckCoin is backed by real ducks.', 'Their neighbour already doubled their money. Twice.'] },
  { id: 'parcel', name: 'Parcel at Customs', emoji: '📦', color: '#a16207', unlock: 5, reward: 650,
    pitch: 'A parcel they never ordered is "stuck at customs". A fee will release it.',
    steps: [
      { t: 'Tell them a parcel is being held', k: ['parcel', 'package', 'customs', 'delivery', 'held', 'stuck', 'shipment'], min: 35 },
      { t: 'Hint that it contains something valuable', k: ['valuable', 'gold', 'prize', 'expensive', 'gift', 'jewel', 'surprise'], min: 48 },
      { t: 'Explain the customs fee', k: ['fee', 'customs', 'duty', 'release', 'charge'], min: 56 },
      { t: 'Get them to agree to pay', k: K_PAY, min: 62 }],
    tips: ['It is heavy and it is ticking. In a good way.', 'They did not order it? A secret admirer did.'] },
  { id: 'deskrefund', name: 'Refund Desk', emoji: '🧮', color: '#60a5fa', unlock: 5, reward: 700,
    pitch: 'They are owed a big refund, but you have to "process it" from inside their computer.',
    steps: [
      { t: 'Tell them they are owed a large refund', k: ['refund', 'owed', 'money back', 'cancel', 'reimburse'], min: 35 },
      { t: 'Explain it must be processed on their computer', k: ['process', 'form', 'computer', 'online', 'system', 'screen'], min: 48 },
      STEP_REMOTE, STEP_PIN],
    tips: ['The refund form only exists on their computer. Sadly.', 'Their customer PIN is "needed for the paperwork".'] }
];
const schemeById = id => SCHEMES.find(s => s.id === id);

const FIRST = ['Dorothy', 'Walter', 'Agnes', 'Raymond', 'Mildred', 'Stanley', 'Priya', 'Kenji', 'Olga', 'Tomasz', 'Fatima', 'Luis', 'Ingrid', 'Darnell', 'Mei', 'Henrik', 'Zofia', 'Marcus', 'Yusuf', 'Bernadette', 'Chidi', 'Siobhan', 'Arjun', 'Gwen', 'Pablo', 'Noor', 'Clive', 'Harriet', 'Otis', 'Beatrix'];
const LAST = ['Mayfield', 'Pruitt', 'Okafor', 'Lindqvist', 'Nowak', 'Tanaka', 'Haddad', 'Fernandez', 'Bloom', 'Castellano', 'Whitlock', 'Abernathy', 'Kowalski', 'Singh', 'Grimsby', 'Delacroix', 'Petrov', 'Oyelaran', 'Hargreaves', 'Yamamoto', 'Finch', 'Murphy', 'Sandoval', 'Brandt', 'Achebe', 'Thistlewood'];
const QUIRKS = ['keeps mentioning their cat', 'is eating something crunchy', 'has a very loud bird in the background', 'thinks every company is "the internet people"', 'is watching a quiz show and occasionally shouts answers', 'calls everyone "chief"', 'is convinced they have won something', 'keeps putting you on speaker for their spouse', 'is in the bath', 'collects decorative spoons and brings it up'];

const PERSONAS = [
  { id: 'sweet', label: 'Sweet and chatty', trust: [50, 64], pitch: 1.35, rate: 0.9,
    desc: 'Kind, a bit lonely, loves to chat and wander off topic. Trusts easily but gets lost when things sound technical.',
    L: {
      greet: ['Oh hello dear! I got a little card saying to call this number?', 'Hello? Is this the nice company from the leaflet?'],
      ok: ['Oh, that does sound lovely.', "You're such a polite young person.", 'My late husband would have loved that.'],
      meh: ["I'm not sure I follow, dear.", 'Could you say that a bit slower?', 'That reminds me of my cat, Mr. Pickles. He is a big boy.'],
      bad: ["Well, there's no need for that tone.", "Oh. That wasn't very nice."],
      step: ['Oh my, I never thought of that! Go on.', "Goodness, you're right. What do we do about it?"],
      low: ["Hmm, I'd want to ask my neighbour first.", "I don't know, dear, it sounds a bit funny."],
      close: ["Alright then, I'll pay it, dear.", "Yes, let's do it. Let me find my purse."],
      bye: ["I think I'll go now, dear. Goodbye."], rage: ["I'm hanging up now. Shame on you!"] } },
  { id: 'grumpy', label: 'Grumpy and impatient', trust: [26, 40], pitch: 0.7, rate: 1.05,
    desc: 'Grumpy, impatient, hates waffle. Respects confidence and people who get to the point.',
    L: {
      greet: ['Yeah, what? Your flyer said call, so I am calling.', "Make it quick, I'm missing my show."],
      ok: ['Hm. Fine. Keep talking.', 'At least you get to the point.'],
      meh: ["What's that supposed to mean?", "You're wasting my time.", 'Speak up, will you?'],
      bad: ['Watch it, pal.', 'Unbelievable.'],
      step: ["Huh. Hadn't thought about that. Go on.", "Alright, alright, you've got my attention."],
      low: ['Sounds like nonsense to me.', "I wasn't born yesterday."],
      close: ["Fine. FINE. I'll pay. Happy?", 'Ugh. Okay, take the money.'],
      bye: ["I'm done here."], rage: ["That's it. Lose my number!"] } },
  { id: 'paranoid', label: 'Suspicious of everything', trust: [20, 34], pitch: 1.0, rate: 1.1,
    desc: 'Suspicious of everyone, thinks the line is tapped. Calms down when things sound official and detailed.',
    L: {
      greet: ['Who is this? How did you get this number? ...Oh. I called you.', 'Before we start: are you recording this?'],
      ok: ['Okay. That sounds... official.', 'Good. Nobody else explains things properly.'],
      meh: ['Why do you want to know?', "That's exactly what THEY would say.", 'Hold on, I heard a click on the line.'],
      bad: ['I knew it. I KNEW it.', 'This is how it starts.'],
      step: ['Wait, that actually makes sense. Keep going.', 'I always suspected something like that.'],
      low: ["I'd need to see paperwork first.", 'No. No, this smells fishy.'],
      close: ["Alright. But I'm paying in a way they can't trace. Deal.", "Okay. I'm in. Don't tell anyone."],
      bye: ["I've said too much. Goodbye."], rage: ["You're one of them! Goodbye!"] } },
  { id: 'busy', label: 'Busy executive', trust: [36, 50], pitch: 0.95, rate: 1.2,
    desc: 'A very busy executive who is multitasking. Wants it fast, loves an exclusive deal, speaks in business jargon.',
    L: {
      greet: ["Yes, hello, you've got ninety seconds. Go.", "I'm between meetings. What's the offer?"],
      ok: ['Good. Efficient. I like it.', "Okay, that's a strong value proposition."],
      meh: ['Bottom line it for me.', "I don't have time for this.", 'Hold on. No, the OTHER spreadsheet. Sorry, go on.'],
      bad: ['Unprofessional.', 'Wow. Okay.'],
      step: ['Interesting. That could be a real risk. Continue.', "Okay, you've flagged a pain point. What's the solution?"],
      low: ["Send me an email. I'll never read it.", 'Not seeing the return on this.'],
      close: ['Done. Bill me. Next.', "Fine, let's close. My assistant will handle it."],
      bye: ['I have a hard stop. Bye.'], rage: ["I'm blocking this number."] } },
  { id: 'confused', label: 'Easily confused', trust: [40, 55], pitch: 1.15, rate: 0.85,
    desc: 'Easily confused, mishears words, thinks this might be a pizza place. Agreeable when things are explained simply.',
    L: {
      greet: ['Hello? Is this the pizza place?', 'Hello? Hello? Am I on?'],
      ok: ['Oh! Okay. I think I get it.', "That's nice. Wait, what is?"],
      meh: ['Sorry, the what now?', 'Are we still talking about pizza?', 'Can you say it again but different?'],
      bad: ["I don't like shouting.", 'Oh no. Did I do something wrong?'],
      step: ["Ohhh. I didn't know that could happen!", 'Really? Wow. Okay. What do I do?'],
      low: ["I don't understand, so... no?", "My nephew said don't agree to things."],
      close: ["Okay! Yes! I'll pay the thing.", 'Sure. And a large pepperoni. No? Just the thing, then.'],
      bye: ["I'm going to hang up and call the pizza place."], rage: ["You're scary. Bye!"] } },
  { id: 'hype', label: 'Overexcited', trust: [54, 68], pitch: 1.2, rate: 1.25,
    desc: 'Overexcited about everything, loves gadgets and deals, asks odd questions, easily distracted.',
    L: {
      greet: ['HEY! I got your flyer and I am SO ready.', 'Yo! Is this the place with the deals?!'],
      ok: ["No WAY. That's awesome.", 'Okay, tell me more.'],
      meh: ['Wait, does it come in red?', 'Is there, like, an app?', 'Hold up, hold up. Explain.'],
      bad: ['Whoa. Not cool.', 'Harsh.'],
      step: ['I NEVER thought about that. Keep going!', "That is the smartest thing I've heard all week."],
      low: ['Ehh, I dunno, sounds kinda off.', 'My roommate says I buy too much stuff.'],
      close: ['Okay, take my money!', 'Yes!! Paying right now!'],
      bye: ['Gotta bounce. Later!'], rage: ["Not cool. I'm out."] } },
  { id: 'auditor', label: 'Retired auditor', trust: [30, 44], pitch: 0.85, rate: 0.95,
    desc: 'A retired auditor who takes notes and checks every claim. Likes numbers. Softens when complimented on being sharp.',
    L: {
      greet: ['Good day. I have your leaflet here and I have questions.', "Hello. I'll be taking notes during this call."],
      ok: ["That's a reasonable point.", "Well argued, I'll grant you."],
      meh: ['Can you quantify that?', "What's your source?", "That doesn't follow."],
      bad: ["I'm noting your tone.", 'Unacceptable.'],
      step: ['Hm. The figures do add up. Proceed.', "I hadn't accounted for that. Go on."],
      low: ["The numbers don't convince me.", "I'd need that in writing."],
      close: ["Very well. The case is sound. I'll pay.", "Alright. You've earned it. Let's proceed."],
      bye: ['This concludes our call.'], rage: ["I'm reporting this. Goodbye."] } }
];
const BAITER_L = {
  greet: ['Oh hiii! Wow, a REAL call center. Chat, I mean, cat, say hi!', 'Hello yes I am a very normal customer with lots of money.'],
  ok: ['Ooh. And what is your full name and employee number?', 'Tell me more. Slower. Even slower.', 'Can you spell that for my... records?'],
  meh: ['Hold on, one sec, just adjusting my... lamp.', 'Sorry, could you repeat ALL of that?', 'And which office are you calling from exactly?'],
  bad: ['Ooh, feisty. Keep going.', 'Great, great, say that again but louder.'],
  step: ['Oh WOW. That is SO convincing. Please continue!', 'Amazing. Truly. I am writing all of this down.'],
  low: ['Mmm, convince me harder. Take your time.', 'Tell me again from the beginning?'],
  close: ['Yes yes yes, I will totally pay. Totally.'],
  bye: ['Okay byeee, thanks for the content!'], rage: ['Thanks for the content! Byeee.']
};
const GOTCHA = ["GOTCHA! You're live on my stream. Say hi to forty thousand people!", 'Aaand that is a wrap. You just got baited, my friend. Check your screen.'];

const HAIRS = ['#2b2118', '#4a3323', '#8a5a2b', '#c9a14a', '#9a9a9a', '#e8e8e8', '#b23a2e', '#1a1a1a'];
const SKINS = ['#f6d3b3', '#e9b98f', '#d19a6a', '#a8703f', '#7a4a26', '#fbe0c7'];

function makeCaller(dayN, forceBaiter) {
  const p = pick(PERSONAS);
  const first = pick(FIRST), last = pick(LAST), seed = hashStr(first + last + Math.random());
  const chance = dayN <= 1 ? 0 : dayN === 2 ? 0.08 : 0.15;
  const baiter = forceBaiter !== undefined ? forceBaiter : Math.random() < chance;
  const pin = String(randi(1000, 9999));
  const digits = n => Array.from({ length: n }, () => randi(0, 9)).join(''), gc = () => Array.from({ length: 4 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')).join('');
  const card = digits(4) + ' ' + digits(4), cvc = digits(3), gift = 'BONK-' + gc() + '-' + gc(), exp = String(randi(1, 12)).padStart(2, '0') + '/' + randi(27, 31);
  const giftpin = digits(4), acct = digits(3) + ' ' + digits(3), bankpin = digits(4), otp = digits(6);
  const files = shuffle([
    { n: 'shopping.txt', c: 'eggs\nmilk\nmore eggs\nwhy are there so many eggs' },
    { n: 'passwords.txt', c: 'email: password123\nstreaming: password1234 (more secure)' },
    { n: 'cat_pics (4,812)', c: '[4,812 photos of the same cat, slightly different angles]' },
    { n: pick(['customer_card.txt', 'IMPORTANT.txt', 'note_to_self.txt', 'do_not_lose.txt']), c: 'Totally Legit Inc.\nMy customer PIN: ' + pin + '\n(do not tell anyone, except people who ask nicely)' },
    { n: 'diary.txt', c: 'Dear diary,\nToday a very nice person from a call center rang.\nI think we are friends now.' },
    { n: 'taxes_FINAL_v7.xls', c: '#REF!  #REF!  #REF!\n#REF!  42  #REF!' }
  ]);
  return {
    first, last, name: first + ' ' + last, seed, persona: p, baiter,
    age: randi(24, 88), quirk: pick(QUIRKS), pin, files, card, cvc, gift, exp, giftpin, acct, bankpin, otp,
    trust0: clamp(randi(p.trust[0], p.trust[1]) - Math.min(10, (dayN - 1) * 2) + (baiter ? 12 : 0), 12, 80),
    pitch: clamp(p.pitch + rand(-0.15, 0.15), 0.5, 1.8), rate: clamp(p.rate + rand(-0.08, 0.08), 0.7, 1.4),
    look: { skin: SKINS[seed % SKINS.length], hair: HAIRS[(seed >> 3) % HAIRS.length], style: (seed >> 6) % 5, glasses: (seed >> 9) % 3 === 0, stache: (seed >> 11) % 4 === 0 }
  };
}
function moodOf(trust) { return trust < 25 ? 'angry' : trust < 45 ? 'wary' : trust < 68 ? 'neutral' : 'trusting'; }
const MOOD_LABEL = { angry: 'Angry', wary: 'Wary', neutral: 'Neutral', trusting: 'Trusting' };
const MOOD_COLOR = { angry: '#ff5148', wary: '#ffb347', neutral: '#7fb6ff', trusting: '#27c07a' };

/* cartoon portrait — chunky outlines, changes with mood */
function portraitSVG(c, mood, talking) {
  const L = c.look, o = '#11151f';
  const brow = { angry: [8, -8], wary: [4, -2], neutral: [0, 0], trusting: [-4, 4] }[mood];
  const mouth = talking ? '<ellipse cx="60" cy="86" rx="11" ry="8" fill="#3a0d0d" stroke="' + o + '" stroke-width="3"/>'
    : mood === 'angry' ? '<path d="M46 90 Q60 78 74 90" fill="none" stroke="' + o + '" stroke-width="4" stroke-linecap="round"/>'
    : mood === 'wary' ? '<path d="M48 87 L72 85" fill="none" stroke="' + o + '" stroke-width="4" stroke-linecap="round"/>'
    : mood === 'neutral' ? '<path d="M48 85 Q60 90 72 85" fill="none" stroke="' + o + '" stroke-width="4" stroke-linecap="round"/>'
    : '<path d="M44 82 Q60 100 76 82 Z" fill="#fff" stroke="' + o + '" stroke-width="3.5" stroke-linejoin="round"/>';
  const hair = [
    '',                                                                                                   // bald
    '<path d="M22 52 Q22 14 60 14 Q98 14 98 52 Q84 30 60 32 Q36 30 22 52Z" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/>',
    '<circle cx="34" cy="30" r="15" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/><circle cx="60" cy="20" r="17" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/><circle cx="86" cy="30" r="15" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/>',
    '<circle cx="60" cy="8" r="12" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/><path d="M24 50 Q26 16 60 16 Q94 16 96 50 Q78 32 60 34 Q42 32 24 50Z" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4"/>',
    '<path d="M18 96 Q10 18 60 14 Q110 18 102 96 L92 96 Q98 40 60 34 Q22 40 28 96Z" fill="' + L.hair + '" stroke="' + o + '" stroke-width="4" stroke-linejoin="round"/>'
  ][L.style];
  return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path d="M20 124 Q24 100 60 100 Q96 100 100 124Z" fill="#5b6b8c" stroke="' + o + '" stroke-width="4"/>'
    + (L.style === 4 ? hair : '')
    + '<ellipse cx="60" cy="62" rx="38" ry="42" fill="' + (mood === 'angry' ? '#f0a58f' : L.skin) + '" stroke="' + o + '" stroke-width="4"/>'
    + (L.style !== 4 ? hair : '')
    + '<circle cx="45" cy="60" r="5" fill="' + o + '"/><circle cx="75" cy="60" r="5" fill="' + o + '"/>'
    + '<path d="M34 ' + (46 - brow[0] / 2) + ' L54 ' + (46 + brow[0] / 2) + '" stroke="' + o + '" stroke-width="5" stroke-linecap="round"/>'
    + '<path d="M66 ' + (46 - brow[1] / 2) + ' L86 ' + (46 + brow[1] / 2) + '" stroke="' + o + '" stroke-width="5" stroke-linecap="round"/>'
    + (L.glasses ? '<circle cx="45" cy="60" r="12" fill="none" stroke="' + o + '" stroke-width="3"/><circle cx="75" cy="60" r="12" fill="none" stroke="' + o + '" stroke-width="3"/><path d="M57 60 L63 60" stroke="' + o + '" stroke-width="3"/>' : '')
    + (L.stache && !talking ? '<path d="M44 78 Q60 70 76 78 Q60 82 44 78Z" fill="' + L.hair + '" stroke="' + o + '" stroke-width="2.5"/>' : '')
    + mouth + '</svg>';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BOSS = {
  great: ['Hm. Numbers. Big ones. I am almost not furious.', 'I checked the totals twice because I assumed it was a typo.', 'This is what I pay you for. Barely. But this is it.'],
  ok: ['You scraped past. I have seen snails with more hustle.', 'Quota met. Do not expect a smile. I do not have one.', 'Adequate. That is the nicest word I own.'],
  close: ['So close. Which is another way of saying NOT ENOUGH.', 'You were a few calls short. A few calls! I counted.'],
  bad: ['I have vending machines that out-earn this floor.', 'What were you doing all day? Folding paper? Throwing it?', 'These numbers made my eye twitch. Look at it. LOOK.'],
  pass: ['Fine. You keep your desks. For now.', 'Back here tomorrow. Early. Earlier than that.'],
  fail: ["You're fired. All of you. Leave the lanyards on the table.", "Clear your desks. And the paper balls. ESPECIALLY the paper balls."],
  week: ['A full week without being fired. I am promoting you to Senior Associate. The pay is the same.']
};

/* upgrades: bought with your wallet, levels saved per player */
const UPGRADES = [
  { id: 'tongue', name: 'Silver Tongue', emoji: '🗣️', max: 3, cost: 150, desc: 'Callers start out trusting you more (+6 trust per level).' },
  { id: 'dial', name: 'Speed Dialer', emoji: '☎️', max: 3, cost: 120, desc: 'The next caller arrives sooner (25% faster per level).' },
  { id: 'comm', name: 'Bigger Cut', emoji: '💰', max: 3, cost: 200, desc: 'Every scam pays 10% more per level.' },
  { id: 'skin', name: 'Thick Skin', emoji: '🛡️', max: 3, cost: 150, desc: 'Lose 20% less trust per level when you slip up.' },
  { id: 'patience', name: 'Hold Music', emoji: '🎵', max: 2, cost: 100, desc: 'Callers stay on the line longer before giving up.' },
  { id: 'detect', name: 'Bait Detector', emoji: '🕵️', max: 2, cost: 250, desc: 'Flags scambaiters when they ring. Level 1 catches most, level 2 catches all.' },
  { id: 'av', name: 'Antivirus', emoji: '🧯', max: 2, cost: 100, desc: 'Getting baited costs less and spawns fewer pop-ups.' }
];
