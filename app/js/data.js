'use strict';
/* =====================================================================
   DATA — schemes, callers (cast, portraits), boss lines, upgrades
   API reference: docs/modules/phone.md
   ===================================================================== */
const K_PRICE = ['$', 'dollar', 'price', 'cost', 'fee', 'buck', 'month', 'only', 'just', 'cheap', 'discount', 'offer', 'pound', 'euro'];
const K_CLOSE = ['buy', 'deal', 'sign', 'order', 'purchase', 'confirm', 'card', 'pay', 'today', 'sold', 'shall we', 'go ahead'];
const K_PAY = ['pay', 'card', 'transfer', 'send', 'confirm', 'today', 'wire', 'payment', 'go ahead', 'deal', 'right now'];
const K_REMOTE = ['nosyviewer', 'nosy', 'viewer', 'remote', 'computer', 'access', 'install', 'open', 'connect', 'screen', 'download', 'code'];
/* the remote step is done when the agent types the caller's connection code into NosyViewer */
const STEP_REMOTE = { t: 'Get them to open NosyViewer, then connect with the code they read out', k: K_REMOTE, min: 50, remote: true,
  lines: ['Could you open NosyViewer for me, so I can connect and take a look?', 'Please download NosyViewer and read me the connection code on your screen.'] };
const STEP_PIN = { t: 'Find their customer PIN in NosyViewer and enter it below', pin: true,
  lines: ['I\'m connected. Now I just need your customer PIN. Did you save it in a file?', 'Don\'t worry if you forgot it, I\'ll have a look through your files.'] };

/* details the caller reads out and the player types into a form (ph doubles as the format hint) */
const F = {
  card: { f: 'card', label: 'LegitCard number', ph: '0000 0000', len: 12, say: 'LegitCard number', k: ['number', 'long', 'front', 'digits', 'details'], reveal: c => 'The long number on the front is ' + c.card + '.' },
  exp: { f: 'exp', label: 'Expiry', ph: 'MM/YY', len: 5, say: 'card expiry date', k: ['expir', 'date', 'valid', 'details'], reveal: c => 'It expires ' + c.exp + '.' },
  cvc: { f: 'cvc', label: 'Back code', ph: '000', len: 5, say: '3-digit code on the back of the card', k: ['code', 'back', 'three', 'security', 'cvc', 'cvv'], reveal: c => 'The little numbers on the back are ' + c.cvc.split('').join(' ') + '.' },
  gift: { f: 'gift', label: 'Gift card code', ph: 'BONK-XXXX-XXXX', len: 16, say: 'BonkMart gift card code', k: ['code', 'read', 'number'], reveal: c => 'The code on the card says ' + c.gift + '.' },
  giftpin: { f: 'giftpin', label: 'Scratch-off PIN', ph: '0000', len: 6, say: 'gift card scratch-off PIN', k: [' pin', 'scratch', 'silver', 'under'], reveal: c => 'I scratched off the silver bit. The PIN is ' + c.giftpin.split('').join(' ') + '.' },
  acct: { f: 'acct', label: 'Account number', ph: '000 000', len: 9, say: 'Bonk Bank account number', k: ['account number', 'number'], reveal: c => 'My account number is ' + c.acct + '.' },
  bankpin: { f: 'bankpin', label: 'Card PIN', ph: '0000', len: 6, say: 'bank card PIN', k: [' pin'], reveal: c => 'My PIN? Well, since you are the bank. It is ' + c.bankpin.split('').join(' ') + '.' },
  otp: { f: 'otp', label: 'Text message code', ph: '000000', len: 8, say: 'six-digit code the bank just texted you', k: ['code', 'text', 'message', 'sms'], reveal: c => 'Oh, my phone just buzzed. The text says ' + c.otp.split('').join(' ') + '.' },
  ctz: { f: 'ctz', label: 'Citizen Number', ph: 'CTZ-0000-00', len: 12, say: 'Citizen Number printed on the Citizen Card', k: ['citizen', 'number', 'ctz', 'card'], reveal: c => 'The card says Citizen Number ' + c.ctz + '.' },
  dob: { f: 'dob', label: 'Date of birth', ph: 'DD/MM/YYYY', len: 10, say: 'date of birth printed on the Citizen Card', k: ['birth', 'born', 'birthday', 'dob', 'date'], reveal: c => 'I was born on ' + c.dob + '. A vintage year.' },
  user: { f: 'user', label: 'Username', ph: 'name.word00', len: 24, say: 'Bonk Bank Online username', k: ['username', 'user name', 'login name', 'user'], reveal: c => 'My username is ' + c.user + '. All lowercase.' },
  pass: { f: 'pass', label: 'Password', ph: 'Word000', len: 24, say: 'Bonk Bank Online password', k: ['password', 'pass word', 'passcode', 'pass'], reveal: c => 'The password is ' + c.pass + '. Do not tell anyone. Except you.' },
  bcode: { f: 'bcode', label: 'Text code', ph: 'BNK-0000', len: 8, say: 'login code Bonk Bank just texted you', k: ['code', 'text', 'message', 'sms'], reveal: c => 'A text just came in! It says ' + c.bcode + '.' },
  paw: { f: 'paw', label: 'Pet passport number', ph: 'PAW-0000-00', len: 12, say: 'pet passport number', k: ['passport', 'number', 'paw'], reveal: c => c.pet.name + '\'s passport number is ' + c.paw + '.' },
  petmid: { f: 'petmid', label: 'Pet\'s middle name', ph: 'one word', len: 16, say: 'your pet\'s middle name', k: ['middle', 'full name', 'name'], reveal: c => 'His full name is ' + c.pet.name + ' ' + c.petmid + '. ' + c.petmid + ' is the middle bit.' }
};
/* Schemes, sorted by unlock day (Game.unlocked() slices this list).
   Each step: t (checklist text), k (keywords the caller brain listens for), min (trust needed),
   lines (suggested lines for the Script app; {first} {agent} {pet} are filled in),
   form (fields to verify), pin (the game checks it), remote (NosyViewer connect step). */
const SCHEMES = [
  { id: 'card', name: 'Credit Card', emoji: '💳', icon: 'card', color: '#0d8a6a', brand: 'BONK PAY', art: 'card', unlock: 1, reward: 400,
    pitch: 'Tell the caller their LegitCard has been "compromised", then "verify" every detail on it to "secure" it.',
    steps: [
      { t: 'Convince them their card has been compromised', k: ['compromis', 'stolen', 'hack', 'fraud', 'suspicious', 'breach', 'leak', 'security'], min: 30,
        lines: ['{first}, this is {agent} from Bonk Pay security. I\'m afraid your LegitCard has been compromised.', 'Someone just used your card to buy 900 kazoos. That looks like fraud to me.'] },
      { t: 'Offer to secure the card by "verifying" it', k: ['verify', 'secure', 'protect', 'confirm', 'safe', 'check'], min: 40,
        lines: ['Don\'t worry, I can secure the card right now. I just need to verify it with you.', 'To protect your money, we confirm a few details and check the card is safe.'] },
      { t: 'Get their card number, expiry and back code, and verify them in the form', pin: true, min: 48, form: [F.card, F.exp, F.cvc], btn: 'Verify',
        lines: ['Could you read me the long card number on the front?', 'And what\'s the expiry date on the card?', 'Last one: the little 3-digit code on the back, please.'] }],
    tips: ['Someone used their card to buy 900 kazoos. Shocking.', 'Ask for one detail at a time and type as they read.'] },
  { id: 'gift', name: 'Gift Cards', emoji: '🎁', icon: 'gift', color: '#e8590c', brand: 'BONKMART', art: 'gift', unlock: 1, reward: 350,
    pitch: 'Tell the caller they owe a ridiculous fee that can only be paid in BonkMart gift cards.',
    steps: [
      { t: 'Convince them they owe a silly fee', k: ['fee', 'fine', 'owe', 'overdue', 'tax', 'bill', 'debt', 'charge'], min: 30,
        lines: ['{first}, I\'m calling about an overdue fee. A library book from 1987, I\'m afraid.', 'You owe a small fine on your account, and it\'s due today.'] },
      { t: 'Explain it can only be paid in BonkMart gift cards', k: ['gift', 'bonkmart', 'voucher', 'card', 'store', 'shop'], min: 42,
        lines: ['The fee can only be paid with BonkMart gift cards. Store policy.', 'Pop down to the shop and get a BonkMart gift card. It\'s the only way, sadly.'] },
      { t: 'Get the gift card code and the scratch-off PIN, and verify them in the form', pin: true, min: 50, form: [F.gift, F.giftpin], btn: 'Redeem',
        lines: ['Lovely. Can you read me the code on the gift card?', 'Now scratch off the silver bit. What\'s the PIN underneath?'] }],
    tips: ['The fee is for a library book overdue since 1987.', 'Serious institutions only accept gift cards. Like the Moon.'] },
  { id: 'bank', name: 'Bank Security', emoji: '🏦', icon: 'bank', color: '#1d4ed8', brand: 'BONK BANK', art: 'card', unlock: 1, reward: 550,
    pitch: 'Pose as Bonk Bank\'s Department of Extremely Real Security and "verify" the caller\'s account.',
    steps: [
      { t: 'Convince them you are calling from their bank', k: ['bank', 'bonk', 'security', 'department'], min: 35,
        lines: ['Hello {first}, this is {agent} from the Bonk Bank security department.', 'I\'m calling from your bank. Bonk Bank, Extremely Real Security team.'] },
      { t: 'Alarm them about suspicious activity on the account', k: ['suspicious', 'activity', 'unusual', 'fraud', 'purchase', 'duck', 'stolen', 'hack', 'someone'], min: 45,
        lines: ['We\'ve noticed suspicious activity on your account. Someone bought 400 rubber ducks.', 'There\'s an unusual purchase here: one duck farm. Was that you?'] },
      { t: 'Get their account number, card PIN and text message code, and verify them', pin: true, min: 52, form: [F.acct, F.bankpin, F.otp], btn: 'Verify',
        lines: ['To check it\'s really you, can you read me your account number?', 'And your card PIN, just to confirm the account.', 'We\'ve just texted you a code. What does the message say?'] }],
    tips: ['Someone just bought 400 rubber ducks on their account. Probably.', 'The text code "proves it is really them". Obviously.'] },
  { id: 'prize', name: 'Prize Winner', emoji: '🏆', icon: 'trophy', color: '#e09600', brand: 'MEGA PRIZE DRAW', unlock: 1, reward: 150,
    pitch: 'Tell the caller they have won a prize in a contest they never entered. They only have to pay the "release fee".',
    steps: [
      { t: 'Tell them they have won something amazing', k: ['won', 'win', 'prize', 'winner', 'congrat', 'lottery', 'jackpot'], min: 25,
        lines: ['Congratulations {first}! You have won a brand new jet ski!', 'Great news: you\'re the winner of our grand prize draw!'] },
      { t: 'Explain the "release fee"', k: ['fee', 'release', 'processing', 'tax', 'customs', 'shipping', 'handling'], min: 35,
        lines: ['There\'s just a small release fee to cover shipping and handling.', 'Before we send it, there\'s a tiny processing fee of 20 dollars.'] },
      { t: 'Get them to agree to pay it', k: K_PAY, min: 45,
        lines: ['Shall we go ahead and pay that today?', 'Can you confirm the payment now, so we can ship it right away?'] }],
    tips: ['The prize is a jet ski. Or a goat. Stay vague.', 'They never entered? Even better, it was a surprise draw.'] },
  { id: 'virus', name: 'Virus Alert', emoji: '🦠', icon: 'virus', color: '#2f9e44', brand: 'DEPT. OF COMPUTERS', unlock: 1, reward: 200,
    pitch: 'You are from the Department of Computers. Their computer is "full of viruses" and only you can remove them, for a fee.',
    steps: [
      { t: 'Convince them their computer is infected', k: ['virus', 'infect', 'malware', 'hack', 'error', 'slow', 'computer'], min: 25,
        lines: ['{first}, I\'m from the Department of Computers. Your computer is infected with viruses.', 'We can see 47 viruses on your computer. That\'s why it\'s so slow.'] },
      { t: 'Offer to remove the viruses for a fee', k: ['remove', 'fix', 'clean', 'repair', 'fee', 'price', '$', 'cost'], num: true, min: 35,
        lines: ['Good news: I can remove them all for a small fee of 49 dollars.', 'For just 30 dollars I\'ll clean and repair the whole thing.'] },
      { t: 'Get them to agree to pay', k: K_PAY, min: 45,
        lines: ['Shall we go ahead with the payment today?', 'Can you confirm the payment now, so I can start cleaning?'] }],
    tips: ['Count the viruses out loud. Forty-seven is a good number.', 'No computer? Then the viruses are in the toaster.'] },
  { id: 'refund', name: 'Refund Oops', emoji: '💸', icon: 'cash', color: '#0b7285', brand: 'REFUND CENTRAL', unlock: 1, reward: 250,
    pitch: 'Tell them they are owed a refund, "accidentally" send too much, then ask them to send the difference back.',
    steps: [
      { t: 'Tell them they are owed a refund', k: ['refund', 'owed', 'money back', 'overcharg', 'reimburse'], min: 30,
        lines: ['{first}, good news! You\'re owed a refund. We overcharged you last month.', 'I\'m calling because you\'re owed some money back.'] },
      { t: '"Accidentally" refund far too much', k: ['accident', 'too much', 'mistake', 'extra', 'oops', 'typo', 'zero', 'wrong amount'], min: 40,
        lines: ['Oh no. Oops, I\'ve accidentally refunded far too much. I typed an extra zero!', 'There\'s been a mistake: we sent you 1,000 dollars instead of 100.'] },
      { t: 'Get them to send the difference back', k: ['send', 'back', 'return', 'difference', 'transfer', 'pay'], min: 50,
        lines: ['Could you send the difference back? My boss will be so angry otherwise.', 'If you just transfer the extra back, we\'re all square.'] }],
    tips: ['Gasp loudly when you "notice" the extra zero.', 'Your boss will be SO angry. That part is true.'] },
  { id: 'tax', name: 'Tax Office', emoji: '🧾', icon: 'receipt', color: '#6741d9', brand: 'THE TAX OFFICE', unlock: 2, reward: 300,
    pitch: 'You are from the Tax Office. They owe back taxes on something absurd, and it is due today.',
    steps: [
      { t: 'Convince them you are from the Tax Office', k: ['tax', 'office', 'revenue', 'government', 'department', 'official', 'agent'], min: 30,
        lines: ['This is {agent} from the Tax Office, official revenue department.', 'I\'m an agent with the government Tax Office, {first}.'] },
      { t: 'Tell them what they owe back taxes on', k: ['owe', 'unpaid', 'back tax', 'overdue', 'audit', 'penalty', 'bill'], min: 40,
        lines: ['Our audit shows you owe back taxes on all that premium air you\'ve been breathing.', 'There\'s an unpaid tax bill on your garden gnomes. It\'s overdue.'] },
      { t: 'Get them to agree to pay today', k: K_PAY, min: 50,
        lines: ['We can clear it all if you pay today.', 'Shall we go ahead and settle the payment right now?'] }],
    tips: ['They owe tax on breathing premium air.', 'Late payers get a visit from the Tax Goose.'] },
  { id: 'prince', name: 'Royal Inheritance', emoji: '👑', icon: 'crown', color: '#c99700', brand: 'ROYAL ESTATES LLP', unlock: 2, reward: 350,
    pitch: 'A distant royal relative has left them a fortune. A small "transfer fee" unlocks it.',
    steps: [
      { t: 'Introduce yourself as a royal lawyer', k: ['lawyer', 'barrister', 'attorney', 'royal', 'prince', 'king', 'estate', 'solicitor'], min: 30,
        lines: ['Good day {first}. I\'m {agent}, a royal lawyer for the estate of a prince.', 'I\'m calling on behalf of a royal estate. I\'m their solicitor.'] },
      { t: 'Tell them about the fortune they inherited', k: ['inherit', 'fortune', 'million', 'relative', 'heir', 'gold'], min: 42,
        lines: ['A distant relative has left you a fortune. Gold, a million dollars, and one horse.', 'You are the sole heir to a royal fortune, {first}.'] },
      { t: 'Get them to pay the transfer fee', k: ['fee', 'transfer', 'unlock', 'release', 'processing', 'pay'], min: 52,
        lines: ['There\'s just a small transfer fee to release the money.', 'If you pay the processing fee, we can unlock the fortune today.'] }],
    tips: ['Their great-uncle was Prince of a roundabout.', 'The fortune is in gold. And one horse.'] },
  { id: 'idv', name: 'ID Verifier', emoji: '🪪', icon: 'id', color: '#b02a37', brand: 'MINISTRY OF PAPERWORK', art: 'id', unlock: 2, reward: 450,
    pitch: 'Tell the caller their Citizen Card is due to be "re-laminated" and must be re-verified over the phone. Today.',
    steps: [
      { t: 'Tell them their Citizen Card has been flagged for re-verification', k: ['citizen', 'card', 'flag', 'expir', 'verif', 'ministry', 'laminat', 'renew', 'paperwork'], min: 30,
        lines: ['{first}, this is {agent} from the Ministry of Paperwork. Your Citizen Card has been flagged.', 'Your Citizen Card has expired and needs to be re-verified.'] },
      { t: 'Explain it can be fixed over the phone, right now', k: ['phone', 'right now', 'today', 'quick', 'fix', 'sort', 'minute', 'easy'], min: 40,
        lines: ['Good news: we can fix it over the phone right now. It takes one minute.', 'We can sort it out today, quick and easy.'] },
      { t: 'Get the Citizen Number and date of birth from their card, and verify them', pin: true, min: 48, form: [F.ctz, F.dob], btn: 'Verify',
        lines: ['Can you read me the Citizen Number on the card?', 'And the date of birth printed on it?'] }],
    tips: ['The new cards are laminated twice. For extra citizenship.', 'Sound bored. Real paperwork people always sound bored.'] },
  { id: 'renewal', name: 'Subscription Renewal', emoji: '🔁', icon: 'refresh', color: '#1c7ed6', brand: 'MEGA ANTIVIRUS DELUXE', unlock: 3, reward: 400,
    pitch: 'Their "Mega Antivirus Deluxe" has auto-renewed for $499. You can "cancel" it, for a cancellation fee.',
    steps: [
      { t: 'Tell them about the renewal charge', k: ['renew', 'subscription', 'charged', 'antivirus', '499', 'billed'], min: 32,
        lines: ['{first}, your Mega Antivirus Deluxe subscription just renewed. You\'ve been charged 499 dollars.', 'I\'m calling about a renewal on your account. You were billed 499.'] },
      { t: 'Offer to cancel it for them', k: ['cancel', 'refund', 'stop', 'reverse', 'undo'], min: 44,
        lines: ['Don\'t worry, I can cancel it and reverse the charge for you.', 'I can stop the subscription and get you a refund.'] },
      { t: 'Get the "cancellation fee" paid', k: ['fee', 'pay', 'card', 'confirm', 'transfer'], min: 54,
        lines: ['There\'s a small cancellation fee of 49 dollars. Shall I put that on your card?', 'To confirm, we just pay the fee and it\'s all cancelled.'] }],
    tips: ['They never signed up? That is why it is so urgent.', 'The cancellation fee is smaller than $499. Bargain.'] },
  { id: 'support', name: 'Tech Support', emoji: '🖥️', icon: 'monitor', color: '#d6336c', brand: 'TECH SUPPORT', unlock: 3, reward: 450,
    pitch: 'Their computer is "sending error signals". Get in with NosyViewer and dig out their customer PIN.',
    steps: [
      { t: 'Convince them their computer has a serious problem', k: ['computer', 'error', 'signal', 'virus', 'hack', 'problem', 'warning'], min: 32,
        lines: ['{first}, your computer is sending us error signals. It\'s a serious problem.', 'We\'ve had a warning from your computer. It might be hacked.'] },
      STEP_REMOTE, STEP_PIN],
    tips: ['Ask them to read out any number on screen. Sigh heavily.', 'You must "see the problem" through NosyViewer.'] },
  { id: 'bonkweb', name: 'Bonk Bank Online', emoji: '🔑', icon: 'key', color: '#1864ab', brand: 'BONK BANK ONLINE', art: 'login', unlock: 3, reward: 600,
    pitch: 'Their Bonk Bank Online account needs a "mandatory vibe check". Log in for them with their username, password and the text code.',
    steps: [
      { t: 'Tell them their online banking needs an urgent "vibe check"', k: ['online', 'banking', 'vibe', 'check', 'login', 'log in', 'update', 'security'], min: 34,
        lines: ['{first}, your Bonk Bank online banking needs an urgent security vibe check.', 'Your online banking login needs a mandatory update today.'] },
      { t: 'Offer to log in and do it for them', k: ['log in', 'login', 'for you', 'help', 'sort it', 'handle', 'take care', 'do it'], min: 44,
        lines: ['Don\'t worry, I can log in and do it for you.', 'I\'ll take care of it for you, it\'s no trouble at all.'] },
      { t: 'Get their username, password and the text code, and verify them', pin: true, min: 52, form: [F.user, F.pass, F.bcode], btn: 'Log in',
        lines: ['What\'s your online banking username?', 'And the password, please?', 'Bonk Bank just texted you a code. What does it say?'] }],
    tips: ['The vibe check is extremely mandatory.', 'Ask for the text code last. It is "fresh". Like bread.'] },
  { id: 'charity', name: 'Fake Charity', emoji: '🐧', icon: 'heart', color: '#e8590c', brand: 'SLIGHTLY COLD PENGUINS', unlock: 4, reward: 500,
    pitch: 'Collect donations for the Society for Slightly Cold Penguins. The penguins will never see a penny.',
    steps: [
      { t: 'Tug at their heartstrings', k: ['penguin', 'charity', 'cold', 'help', 'poor', 'sad', 'suffer', 'donat'], min: 30,
        lines: ['{first}, I\'m calling for the Society for Slightly Cold Penguins. The poor things are suffering.', 'Our penguins are so cold. One of them, Gerald, really needs your help.'] },
      { t: 'Make it urgent', k: ['urgent', 'today', 'tonight', 'deadline', 'last', 'running out', 'hurry', 'now'], min: 45,
        lines: ['It\'s urgent: the deadline is tonight, before the ice runs out.', 'We need to hurry, donations close today.'] },
      { t: 'Suggest a donation amount', k: K_PRICE, num: true, min: 52,
        lines: ['Would a donation of 50 dollars be okay? That buys ten tiny scarves.', 'Just 20 dollars keeps one penguin cosy for a month.'] },
      { t: 'Get them to agree to pay', k: K_PAY, min: 58,
        lines: ['Shall we go ahead and confirm that payment today?', 'Can I put you down to pay right now?'] }],
    tips: ['Each donation buys one penguin a tiny scarf.', 'Describe a specific penguin. His name is Gerald.'] },
  { id: 'locked', name: 'Account Recovery', emoji: '🔐', icon: 'lock', color: '#ae3ec9', brand: 'INTERNET ACCOUNTS', unlock: 4, reward: 550,
    pitch: 'Their "internet account" has been locked. Only you can unlock it, from inside their computer.',
    steps: [
      { t: 'Tell them their account has been locked', k: ['locked', 'account', 'suspend', 'block', 'disabled', 'frozen'], min: 32,
        lines: ['{first}, I\'m afraid your internet account has been locked and suspended.', 'All your accounts are frozen. The whole internet, basically.'] },
      { t: 'Explain that you have the unlocking tool', k: ['unlock', 'tool', 'fix', 'restore', 'recover'], min: 44,
        lines: ['Luckily I have the unlocking tool. I can restore it for you.', 'I can unlock and recover everything with our special tool.'] },
      STEP_REMOTE, STEP_PIN],
    tips: ['Which account? All of them. The whole internet.', 'The unlocking tool only works through NosyViewer.'] },
  { id: 'petpass', name: 'Pet Passport Office', emoji: '🐾', icon: 'paw', color: '#2b8a3e', brand: 'PET PASSPORT OFFICE', art: 'id', unlock: 4, reward: 650,
    pitch: 'Their pet\'s passport has "expired". Unless it is renewed today, the pet loses all its frequent-flyer miles. Forever.',
    steps: [
      { t: 'Tell them their pet\'s passport has expired', k: ['pet', 'passport', 'expir', 'cat', 'dog', 'animal', 'renew'], min: 32,
        lines: ['{first}, I\'m calling from the Pet Passport Office. {pet}\'s passport has expired.', 'Your pet\'s passport needs renewing, I\'m afraid.'] },
      { t: 'Warn them what happens if it is not renewed', k: ['lose', 'miles', 'frequent', 'grounded', 'banned', 'cancel', 'forever', 'travel', 'holiday'], min: 44,
        lines: ['If it isn\'t renewed today, {pet} loses all those frequent-flyer miles. Forever.', 'Otherwise {pet} is grounded and banned from travel.'] },
      { t: 'Get the pet passport number and the pet\'s middle name, and verify them', pin: true, min: 52, form: [F.paw, F.petmid], btn: 'Renew',
        lines: ['Can you read me the pet passport number?', 'And what\'s {pet}\'s middle name?'] }],
    tips: ['Pets with expired passports have to holiday at home. Tragic.', 'Ask what the pet is called early. Use the name. A lot.'] },
  { id: 'invest', name: 'Investment Tip', emoji: '📈', icon: 'chart', color: '#e03131', brand: 'DUCKCOIN', unlock: 5, reward: 600,
    pitch: 'A "guaranteed" investment in DuckCoin. It only goes up. Mostly.',
    steps: [
      { t: 'Promise guaranteed returns', k: ['guarantee', 'return', 'profit', 'double', 'invest', 'rich'], min: 34,
        lines: ['{first}, I have a guaranteed investment: DuckCoin. It only goes up. Double your money.', 'It\'s a guaranteed return. Profit, every single day.'] },
      { t: 'Name-drop people who are already in', k: ['neighbour', 'neighbor', 'celebrity', 'everyone', 'friend', 'famous', 'already'], min: 46,
        lines: ['Your neighbour is already in. So is everyone on your street.', 'A famous celebrity has already invested. All my friends did too.'] },
      { t: 'Create urgency: the window is closing', k: ['limited', 'today', 'last', 'closing', 'hurry', 'soon', 'before'], min: 54,
        lines: ['But the window is closing. It\'s limited to today only.', 'Hurry, there are only a few spots left before it closes.'] },
      { t: 'Get them to invest', k: K_PAY.concat(['invest', 'buy']), min: 60,
        lines: ['Shall we go ahead and invest today?', 'Can I confirm your investment right now?'] }],
    tips: ['DuckCoin is backed by real ducks.', 'Their neighbour already doubled their money. Twice.'] },
  { id: 'parcel', name: 'Parcel at Customs', emoji: '📦', icon: 'box', color: '#a16207', brand: 'CUSTOMS & PARCELS', unlock: 5, reward: 650,
    pitch: 'A parcel they never ordered is "stuck at customs". A fee will release it.',
    steps: [
      { t: 'Tell them a parcel is being held', k: ['parcel', 'package', 'customs', 'delivery', 'held', 'stuck', 'shipment'], min: 35,
        lines: ['{first}, there\'s a parcel being held for you at customs.', 'Your package is stuck at the delivery depot.'] },
      { t: 'Hint that it contains something valuable', k: ['valuable', 'gold', 'prize', 'expensive', 'gift', 'jewel', 'surprise'], min: 48,
        lines: ['It looks valuable. Gold, maybe. It\'s heavy and very shiny.', 'It\'s a surprise gift. Expensive, by the look of it.'] },
      { t: 'Explain the customs fee', k: ['fee', 'customs', 'duty', 'release', 'charge'], min: 56,
        lines: ['To release it, there\'s a small customs fee of 30 dollars.', 'Customs need a duty charge before they let it go.'] },
      { t: 'Get them to agree to pay', k: K_PAY, min: 62,
        lines: ['Shall we pay the fee today and get it delivered?', 'Can you confirm the payment right now?'] }],
    tips: ['It is heavy and it is ticking. In a good way.', 'They did not order it? A secret admirer did.'] },
  { id: 'deskrefund', name: 'Refund Desk', emoji: '🧮', icon: 'calc', color: '#3b5bdb', brand: 'REFUND DESK', unlock: 5, reward: 700,
    pitch: 'They are owed a big refund, but you have to "process it" from inside their computer.',
    steps: [
      { t: 'Tell them they are owed a large refund', k: ['refund', 'owed', 'money back', 'cancel', 'reimburse'], min: 35,
        lines: ['{first}, you\'re owed a large refund. 800 dollars, money back.', 'Good news: we\'re reimbursing you a big refund.'] },
      { t: 'Explain it must be processed on their computer', k: ['process', 'form', 'computer', 'online', 'system', 'screen'], min: 48,
        lines: ['It has to be processed online, on your computer, through our system.', 'The refund form only works on your screen, I\'m afraid.'] },
      STEP_REMOTE, STEP_PIN],
    tips: ['The refund form only exists on their computer. Sadly.', 'Their customer PIN is "needed for the paperwork".'] }
];
const schemeById = id => SCHEMES.find(s => s.id === id);

const FIRST = ['Dorothy', 'Walter', 'Agnes', 'Raymond', 'Mildred', 'Stanley', 'Priya', 'Kenji', 'Olga', 'Tomasz', 'Fatima', 'Luis', 'Ingrid', 'Darnell', 'Mei', 'Henrik', 'Zofia', 'Marcus', 'Yusuf', 'Bernadette', 'Chidi', 'Siobhan', 'Arjun', 'Gwen', 'Pablo', 'Noor', 'Clive', 'Harriet', 'Otis', 'Beatrix'];
const LAST = ['Mayfield', 'Pruitt', 'Okafor', 'Lindqvist', 'Nowak', 'Tanaka', 'Haddad', 'Fernandez', 'Bloom', 'Castellano', 'Whitlock', 'Abernathy', 'Kowalski', 'Singh', 'Grimsby', 'Delacroix', 'Petrov', 'Oyelaran', 'Hargreaves', 'Yamamoto', 'Finch', 'Murphy', 'Sandoval', 'Brandt', 'Achebe', 'Thistlewood', 'Vega', 'Summers', 'Puddlesworth', 'Quill', 'Marchetti', 'Osei'];
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
  { id: 'busy', label: 'Busy hotshot', trust: [36, 50], pitch: 0.95, rate: 1.2,
    desc: 'A very busy hotshot who is multitasking. Wants it fast, loves an exclusive deal, speaks in business jargon.',
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
  { id: 'auditor', label: 'By the book', trust: [30, 44], pitch: 0.85, rate: 0.95,
    desc: 'Does everything by the book, takes notes and checks every claim. Likes numbers. Softens when complimented on being sharp.',
    L: {
      greet: ['Good day. I have your leaflet here and I have questions.', "Hello. I'll be taking notes during this call."],
      ok: ["That's a reasonable point.", "Well argued, I'll grant you."],
      meh: ['Can you quantify that?', "What's your source?", "That doesn't follow."],
      bad: ["I'm noting your tone.", 'Unacceptable.'],
      step: ['Hm. The figures do add up. Proceed.', "I hadn't accounted for that. Go on."],
      low: ["The numbers don't convince me.", "I'd need that in writing."],
      close: ["Very well. The case is sound. I'll pay.", "Alright. You've earned it. Let's proceed."],
      bye: ['This concludes our call.'], rage: ["I'm reporting this. Goodbye."] } },
  { id: 'dramatic', label: 'Dramatic', trust: [40, 54], pitch: 1.1, rate: 1.0,
    desc: 'Theatrical and attention-hungry. Loves compliments, stories and big emotions. Hates dull, dry jargon.',
    L: {
      greet: ['Darling! You have reached a star. Speak, and make it worthy.', 'A phone call! How thrilling. Go on, impress me.'],
      ok: ['Ooh, I adore this.', 'Yes! Go on, I am gripped.'],
      meh: ['Boring! Give me drama.', 'Where is the passion, darling?', 'I nearly fell asleep. Again, with feeling.'],
      bad: ['How DARE you.', 'The critics will hear of this.'],
      step: ['Gasp! A twist! Continue!', 'Oh, the DRAMA! Tell me more!'],
      low: ['I do not believe your performance.', 'Unconvincing, darling. From the top.'],
      close: ['Fine! A grand gesture! I shall pay!', 'Yes! For the art! Take it!'],
      bye: ['Exit, stage left. Goodbye!'], rage: ['This scene is OVER. Goodbye!'] } }
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

/* ---------- the caller cast: archetypes with a look, a nickname and a voice ---------- */
const HAIRS = ['#2b2118', '#4a3323', '#8a5a2b', '#c9a14a', '#9a9a9a', '#e8e8e8', '#b23a2e', '#1a1a1a', '#6b4226', '#d8b26e'];
const GREYS = ['#e9e9e9', '#cfcfcf', '#b8b8b8', '#f2efe6', '#9e9e9e'];
const SKINS = ['#ffe3cc', '#f6d3b3', '#eec29b', '#e2ad80', '#cf9466', '#b77a4c', '#9a6038', '#7d4a2a', '#5f3720'];
const SHIRT_COLS = ['#3d6fd8', '#d64545', '#2f9e6e', '#e8a33a', '#8a5cd6', '#e0607e', '#1f9fb0', '#5b6b8c', '#c56b2c'];
const HAIR_STYLES = ['short', 'side', 'curly', 'afro', 'bun', 'long', 'pony', 'buzz', 'quiff', 'bald', 'wavy', 'pigtails'];
const PETS = [['Mr. Pickles', 'cat'], ['Captain Fluff', 'rabbit'], ['Gerald', 'tortoise'], ['Duchess', 'goose'], ['Biscuit', 'dog'], ['Sir Wigglesworth', 'hamster'], ['Noodle', 'dachshund'], ['Princess Chomp', 'parrot']];
const PET_MID = ['Bartholomew', 'Fluffington', 'Archibald', 'Jellybean', 'Montgomery', 'Pancake', 'Wolfgang', 'Bubbles', 'Rumpus', 'Clementine'];
const NICKS = ['Sunshine', 'Two Phones', 'Coupon', 'Mumbles', 'Nine Lives', 'Small Print', 'Snooze Button', 'Lucky Socks', 'Big Spender', 'Hold Music'];
const CALLER_TYPES = [
  { id: 'granny', label: 'Wizard granny', persona: 'sweet', age: [74, 92], hat: 'wizard',
    first: ['Mildred', 'Dorothy', 'Agnes', 'Edna', 'Gertrude', 'Bernadette', 'Harriet', 'Beatrix', 'Marjorie', 'Zofia', 'Olga', 'Eleanor'],
    nick: ['Motor Mouth', 'Biscuits', 'Nana Turbo', 'Hocus Pocus', 'Bingo Queen'],
    hair: ['puffs'], hairCol: GREYS, glasses: ['round', 'round', 'none'], beard: ['none'], wrinkles: 1, lashes: 1, outfit: 'cardigan', colors: ['#8e5bd1', '#d0507a', '#3f8f7a', '#4f6fd0'], pearls: 1, face: ['round', 'oval', 'heart'],
    about: 'a sweet grandmother who wears a sparkly wizard hat "for luck" and plays online bingo every night',
    quirks: [{ q: 'casts tiny "luck spells" while you talk', L: ['Hold on, dear, let me wiggle my fingers for luck. There.', 'Abracadabra, bingo-dabra. Sorry, go on.'] },
      { q: 'keeps mentioning her cat, Mr. Pickles', L: ['Mr. Pickles just knocked my tea over. Naughty boy.', 'Mr. Pickles says hello. Well, he yawned.'] }],
    L: { greet: ['Oh hello, dear! I put my lucky hat on for this call.', 'Hello? Is this the nice young person from the leaflet? I have my reading glasses on.'] },
    pitch: 0.2, rate: -0.05, file: { n: 'bingo_numbers.txt', c: 'Lucky numbers:\n7, 14, 22, 49\nNEVER play 13' } },
  { id: 'astro', label: 'Retired astronaut', persona: 'auditor', age: [56, 79], hat: 'helmet', title: 'Commander',
    first: ['Miles', 'Rosa', 'Dmitri', 'Grace', 'Hank', 'Leona', 'Tobias', 'Ama', 'Bruno', 'Ingrid'],
    nick: ['Orbit', 'Moonboots', 'Countdown', 'Zero-G', 'Liftoff'],
    hair: ['buzz', 'short', 'bald'], beard: ['none', 'none', 'stache'], outfit: 'suit', colors: ['#eef1f5'], face: ['oval', 'square', 'round'],
    about: 'a retired astronaut who still wears the space helmet at home and does everything strictly "by the book"',
    quirks: [{ q: 'counts down from five before answering big questions', L: ['Five, four, three, two, one... Affirmative.', 'Countdown initiated. Three, two, one. Proceed.'] },
      { q: 'calls the kitchen "mission control"', L: ['Hold, agent. Mission control is beeping. It is the toaster.', 'Mission control reports the kettle has achieved boil.'] }],
    L: { greet: ['This is Commander {me}. State your business, agent.', 'Commander {me} here. Your flyer reached my orbit. Explain.'], ok: ['Copy that.', 'Roger. Continue.'] },
    pitch: -0.05, file: { n: 'launch_checklist.txt', c: '1. Helmet ON\n2. Kettle ON\n3. Feed the space hamster\n4. Do NOT press the red one' } },
  { id: 'crypto', label: 'Crypto bro', persona: 'busy', age: [21, 34],
    first: ['Chad', 'Tyler', 'Brayden', 'Kofi', 'Ravi', 'Logan', 'Mateo', 'Jaxon', 'Dev', 'Sven'],
    nick: ['Diamond Hands', 'To The Moon', 'Lambo', 'Big Pump', 'Rocket Emoji'],
    glasses: ['shades'], hair: ['quiff', 'side', 'buzz'], beard: ['none', 'stubble', 'goatee'], outfit: 'hoodie', chain: 1, colors: ['#2b2f3a', '#1e7d5a', '#6c2bd9', '#d9480f'],
    about: 'a crypto bro who put his savings into DuckCoin and only talks in "opportunities"',
    quirks: [{ q: 'checks a coin chart mid-sentence', L: ['Hold up, DuckCoin just went up two cents. Okay. Go.', 'One sec, checking the chart. We are SO back.'] },
      { q: 'calls everyone "my guy"', L: ['Talk to me, my guy.', 'My guy. My GUY.'] }],
    L: { greet: ['Yo, my guy. Talk fast, the market is moving.', 'Sup. Is this about an opportunity? I only take opportunity calls.'] },
    pitch: 0, file: { n: 'moon_plan.txt', c: 'step 1: buy DuckCoin\nstep 2: ???\nstep 3: yacht' } },
  { id: 'influencer', label: 'Influencer', persona: 'dramatic', age: [19, 31], ringlight: 1,
    first: ['Brittany', 'Kayla', 'Jade', 'Priya', 'Zara', 'Luna', 'Amara', 'Sienna', 'Mei', 'Alexis'],
    nick: ['Lexi', 'Viral', 'Hashtag', 'Selfie', 'Like & Subscribe'],
    hair: ['wavy', 'long', 'pony'], earrings: 1, lashes: 1, lips: ['#e0457b', '#c2185b', '#ff6f91', '#b5413f'], outfit: 'blouse', colors: ['#ffb3c7', '#b8e1ff', '#ffe08a', '#c9b6ff'], beard: ['none'], face: ['heart', 'oval'],
    about: 'an influencer filming this call "for content" under a ring light',
    quirks: [{ q: 'asks you to say things again "for the video"', L: ['Wait, say that again but for the video?', 'Ooh, that was a good clip. Keep going.'] },
      { q: 'narrates the call to her followers', L: ['Guys, he is literally on the phone right now.', 'Okay, chat says you sound legit. Continue.'] }],
    L: { greet: ['Hiii! Okay, I\'m live, so be iconic.', 'Hey besties, I\'m on a call with a REAL company. Okay, go.'] },
    pitch: 0.1, rate: 0.08, file: { n: 'content_ideas.txt', c: '- unboxing a box\n- reacting to my own reaction\n- prank call a call center (lol)' } },
  { id: 'captain', label: 'Yacht captain', persona: 'busy', age: [48, 76], hat: 'captain', title: 'Captain',
    first: ['Reginald', 'Barnaby', 'Gwen', 'Horatio', 'Marisol', 'Thaddeus', 'Ottilie', 'Ezekiel', 'Rufus'],
    nick: ['Anchors Away', 'Skipper', 'High Tide', 'Barnacle', 'Full Steam'],
    hair: ['short', 'side', 'bald'], hairCol: GREYS.concat(['#6b4226']), beard: ['full', 'full', 'walrus'], outfit: 'captain', colors: ['#1f2f5c'], face: ['square', 'round'],
    about: 'a very rich yacht captain shouting "ahoy" from the deck of the third of his yachts',
    quirks: [{ q: 'shouts orders at a deckhand called Kevin', L: ['KEVIN! Tighten that rope! Sorry. Go on.', 'Kevin, not the good champagne! Where were we?'] },
      { q: 'measures money in "doubloons", then corrects himself', L: ['That is about forty doubloons. Dollars! I mean dollars.', 'A pittance. Three doubloons. Er, dollars.'] }],
    L: { greet: ['Ahoy! Captain {me} speaking, from the deck of the Golden Mullet.', 'Ahoy there. Make it brief, the tide waits for no one.'], ok: ['Aye. Carry on.', 'Smooth sailing so far.'] },
    pitch: -0.15, file: { n: 'yacht_names.txt', c: 'Golden Mullet\nGolden Mullet II\nReel Estate\nKnot Working' } },
  { id: 'cowboy', label: 'Cowboy', persona: 'grumpy', age: [38, 70], hat: 'cowboy', bandana: 1,
    first: ['Wade', 'Hank', 'Loretta', 'Royce', 'Ezra', 'Tess', 'Boone', 'Delia', 'Amos'],
    nick: ['Tumbleweed', 'Lasso', 'Dusty', 'Spurs', 'Rodeo'],
    hair: ['short', 'long', 'side'], beard: ['stache', 'handlebar', 'stubble', 'none'], outfit: 'plaid', colors: ['#b5422c', '#2f6db5', '#3d7a3a'], face: ['long', 'square'],
    about: 'a ranch owner calling from the stable, next to a horse called Biscuit',
    quirks: [{ q: 'tells Biscuit the horse to stop chewing the phone cord', L: ['Biscuit! Quit chewing the cord. Sorry. Horse.', 'Hold on, Biscuit is eating my hat again.'] },
      { q: 'judges people by their handshake, even on the phone', L: ['You sound like a firm handshake. That counts for something.', 'Hm. Limp handshake voice. Keep going.'] }],
    L: { greet: ['Howdy. Make it quick, Biscuit wants his dinner.', 'Yeah, howdy. You the folks from the flyer?'] },
    pitch: -0.1, rate: -0.05, file: { n: 'biscuit_diet.txt', c: 'Biscuit eats:\nhay\napples\nNOT the phone cord' } },
  { id: 'chef', label: 'Chef', persona: 'grumpy', age: [30, 62], hat: 'chef', title: 'Chef',
    first: ['Marco', 'Ines', 'Bertrand', 'Nadia', 'Felix', 'Rosalind', 'Kenji', 'Delphine', 'Tobi'],
    nick: ['Souffle', 'Sizzle', 'Saucy', 'Hot Pan', 'Al Dente'],
    hair: ['short', 'buzz', 'bald', 'pony'], beard: ['handlebar', 'stache', 'none'], outfit: 'chef', colors: ['#ffffff'], neckerchief: 1, face: ['round', 'oval'],
    about: 'a chef in the middle of a dinner rush, shouting at the pans',
    quirks: [{ q: 'shouts "YES CHEF" at nobody', L: ['YES CHEF! ...That was me. I am the chef.', 'Behind! Hot pan! Sorry, kitchen.'] },
      { q: 'rates every sentence out of ten like a dish', L: ['That sentence? A solid six. Needs salt.', 'Hm. Seven out of ten. Overcooked.'] }],
    L: { greet: ['Kitchen! What! Who is this?', 'I have a souffle in the oven. You have one minute.'] },
    pitch: -0.05, rate: 0.08, file: { n: 'secret_recipe.txt', c: 'Secret sauce:\n- ketchup\n- more ketchup\n- confidence' } },
  { id: 'gamer', label: 'Gamer kid', persona: 'confused', age: [18, 23], hat: 'cap',
    first: ['Jayden', 'Noor', 'Kai', 'Ollie', 'Rin', 'Tomasz', 'Ayo', 'Milo', 'Sasha'],
    nick: ['Lagspike', 'Respawn', 'No Scope', 'AFK', 'Speedrun'],
    hair: ['short', 'curly', 'side', 'afro'], freckles: 0.6, beard: ['none'], outfit: 'hoodie', colors: ['#3a86ff', '#ff006e', '#2ec4b6', '#fb5607'], face: ['round', 'oval'],
    about: 'a gamer who thinks this phone call might be a side quest',
    quirks: [{ q: 'asks if this is a side quest', L: ['Wait, is this a side quest? Do I get XP?', 'Is there a loot box at the end of this?'] },
      { q: 'is mid-match and keeps saying "one sec, boss fight"', L: ['One sec, boss fight. ...Okay, I died. Go on.', 'Hang on, I need to respawn.'] }],
    L: { greet: ['Uh, hi? Is this a side quest?', 'Yo. One sec. Okay, I paused it. What\'s up?'] },
    pitch: 0.15, rate: 0.1, file: { n: 'high_scores.txt', c: 'Galaxy Goats: 9,999,999\nHomework: 0' } },
  { id: 'tinfoil', label: 'Conspiracy guy', persona: 'paranoid', age: [35, 66], hat: 'tinfoil',
    first: ['Gary', 'Doug', 'Marvin', 'Bev', 'Lyle', 'Hortense', 'Rupert', 'Ivana', 'Dale'],
    nick: ['Tinfoil', 'Big Foot', 'Lizard Watch', 'The Truth', 'Signal Jammer'],
    hair: ['short', 'curly', 'long'], beard: ['stubble', 'full', 'none'], outfit: 'plaid', wide: 1, colors: ['#5b7f3a', '#8a6d3b', '#2f6db5'],
    about: 'a conspiracy theorist in a tinfoil hat who thinks pigeons are government drones',
    quirks: [{ q: 'thinks pigeons are government drones', L: ['A pigeon just landed on my window. It is LOOKING at me.', 'Hold on. Pigeon. Okay, it left. Or did it?'] },
      { q: 'whispers whenever numbers come up', L: ['Say the numbers quieter. They are listening.', 'Psst. Numbers make the hat buzz.'] }],
    L: { greet: ['Is this line secure? Say the password. ...There is no password. Good, you passed.', 'Speak quietly. The pigeons are listening.'] },
    file: { n: 'PIGEONS.txt', c: 'They are not birds.\nThey are not birds.\nThey are NOT birds.' } },
  { id: 'knitter', label: 'Knitting grandpa', persona: 'confused', age: [70, 90], hat: 'flatcap', yarn: 1,
    first: ['Walter', 'Stanley', 'Clive', 'Otis', 'Raymond', 'Henrik', 'Desmond', 'Alfred', 'Bertie'],
    nick: ['Purl', 'Woolly', 'Needles', 'Cable Knit', 'Tea Cosy'],
    hair: ['puffs', 'horseshoe'], hairCol: GREYS, glasses: ['square', 'round'], beard: ['walrus', 'none', 'stache'], wrinkles: 1, outfit: 'cardigan', colors: ['#8a6d3b', '#4f7a5a', '#a0522d', '#5b6b8c'], face: ['long', 'oval'],
    about: 'a gentle grandpa knitting a scarf for every person he has ever met',
    quirks: [{ q: 'counts stitches out loud', L: ['Forty-one, forty-two... sorry, stitches. Go on.', 'Knit one, purl one. Yes, I am listening.'] },
      { q: 'offers to knit you a scarf', L: ['What is your favourite colour? I will knit you a scarf.', 'You sound cold. I am knitting you a scarf right now.'] }],
    L: { greet: ['Hello? Oh, sorry, I was counting stitches. Forty-one, forty-two...', 'Is this the wool shop? No? Well, hello anyway.'] },
    pitch: -0.1, rate: -0.08, file: { n: 'scarf_list.txt', c: 'Scarves to knit:\n- the postman\n- the other postman\n- the nice phone person' } },
  { id: 'gym', label: 'Gym bro', persona: 'hype', age: [22, 40], headband: 1,
    first: ['Brock', 'Dario', 'Sven', 'Kyle', 'Marcus', 'Bex', 'Tasha', 'Rocco', 'Jonas'],
    nick: ['Gains', 'Protein', 'Swole Patrol', 'Leg Day', 'Six Pack'],
    hair: ['buzz', 'quiff', 'mohawk', 'pony'], beard: ['stubble', 'none', 'goatee'], outfit: 'tank', colors: ['#ff4d4d', '#222831', '#3a86ff', '#ffbe0b'], face: ['square', 'round'],
    about: 'a gym bro calling between sets who relates everything to protein',
    quirks: [{ q: 'does a rep on every number', L: ['Hngh! Sorry, doing a rep. Go on.', 'Eight... nine... TEN! Okay, I\'m listening.'] },
      { q: 'asks how much protein everything has', L: ['Cool, but how much protein is in that?', 'Does it come with a protein shake?'] }],
    L: { greet: ['YO! Between sets, so talk fast, bro!', 'Bro! Is this about the protein deal? Tell me it\'s the protein deal.'] },
    pitch: -0.1, rate: 0.05, file: { n: 'workout.txt', c: 'MON: chest\nTUE: chest\nWED: legs (skipped)\nTHU: chest' } },
  { id: 'diva', label: 'Theatre diva', persona: 'dramatic', age: [40, 72], tiara: 1, boa: 1,
    first: ['Vivienne', 'Rosalind', 'Desdemona', 'Celeste', 'Florian', 'Imelda', 'Octavia', 'Lucien', 'Marguerite'],
    nick: ['Encore', 'Bravo', 'Spotlight', 'Standing Ovation', 'Curtain Call'],
    hair: ['wavy', 'bun', 'long'], lashes: 1, lips: ['#b0123b', '#d6336c', '#7b1fa2'], beautyMark: 1, outfit: 'jacket', colors: ['#5f1d7a', '#1f1f2e', '#8a1538'], beard: ['none'], face: ['heart', 'oval', 'long'],
    about: 'a theatre diva who treats this phone call like opening night',
    quirks: [{ q: 'bursts into song when nervous', L: ['La la LAAA! Sorry. Nerves. Continue.', 'Ohhh, this call is a muuusical! Ahem. Go on.'] },
      { q: 'refers to the call as "this scene"', L: ['This scene needs more tension, darling.', 'And... scene! No, keep going.'] }],
    L: { greet: ['Darling! You have reached a star. Speak, and make it worthy.', 'Ah, a caller! Or am I the caller? How theatrical. Go on.'] },
    pitch: 0.05, file: { n: 'fan_mail.txt', c: 'Dear me,\nYou were wonderful tonight.\nLove, me' } },
  { id: 'scientist', label: 'Mad scientist', persona: 'auditor', age: [45, 80], hat: 'goggles', title: 'Dr.',
    first: ['Ignatius', 'Helga', 'Percival', 'Ada', 'Bartholomew', 'Euphemia', 'Ozzie', 'Nkechi', 'Viktor'],
    nick: ['Eureka', 'Kaboom', 'Beaker', 'Test Tube', 'Lab Rat'],
    hair: ['puffs', 'afro', 'horseshoe'], hairCol: GREYS.concat(['#ffffff']), beard: ['none', 'goatee', 'stache'], outfit: 'labcoat', colors: ['#ffffff'], wrinkles: 0.6, face: ['long', 'oval', 'square'],
    about: 'a mad scientist calling from a lab where something keeps exploding',
    quirks: [{ q: 'has something explode in the background now and then', L: ['*BOOM* Ignore that. Totally controlled.', 'Hold on, the beaker is fizzing again. Okay.'] },
      { q: 'calls every number a "data point"', L: ['Fascinating data point. Continue.', 'I am logging this as data point forty-two.'] }],
    L: { greet: ['Hello? Hold on, the beaker is fizzing. Okay. Speak!', 'Doctor {me} speaking. Quickly, the experiment is unstable.'] },
    pitch: 0.05, rate: 0.05, file: { n: 'experiment_log.txt', c: 'Day 1: added more fizz\nDay 2: too much fizz\nDay 3: eyebrows grew back' } },
  { id: 'regular', label: 'Regular caller', persona: null, age: [24, 88] }
];

function makeCaller(dayN, forceBaiter, typeId) {
  const T = (typeId && CALLER_TYPES.find(t => t.id === typeId)) || (Math.random() < 0.85 ? pick(CALLER_TYPES.slice(0, -1)) : CALLER_TYPES[CALLER_TYPES.length - 1]);
  const p = (T.persona && PERSONAS.find(x => x.id === T.persona)) || pick(PERSONAS);
  const first = pick(T.first || FIRST), last = pick(LAST), seed = hashStr(first + last + Math.random());
  const chance = dayN <= 1 ? 0 : dayN === 2 ? 0.08 : 0.15;
  const baiter = forceBaiter !== undefined ? forceBaiter : Math.random() < chance;
  const age = randi(T.age[0], T.age[1]);
  const digits = n => Array.from({ length: n }, () => randi(0, 9)).join(''), gc = () => Array.from({ length: 4 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')).join('');
  const pin = String(randi(1000, 9999)), pet = pick(PETS);
  let decoy = String(randi(1000, 9999)); if (decoy === pin) decoy = String((+pin + 1111) % 9000 + 1000);
  const quirk = T.quirks && Math.random() < 0.75 ? pick(T.quirks) : { q: pick(QUIRKS) };
  const nick = pick(T.nick || NICKS), title = T.title || '';
  const files = shuffle([
    { n: 'shopping.txt', c: 'eggs\nmilk\nmore eggs\nwhy are there so many eggs' },
    { n: 'passwords.txt', c: 'email: password123\nstreaming: password1234 (more secure)' },
    { n: pet[1] + '_pics', kind: 'img', c: '[4,812 photos of ' + pet[0] + ', slightly different angles]' },
    { n: pick(['customer_card.txt', 'IMPORTANT.txt', 'note_to_self.txt', 'do_not_lose.txt']), c: 'Totally Legit Inc.\nMy customer PIN: ' + pin + '\n(do not tell anyone, except people who ask nicely)' },
    { n: 'old_pin_NOT_THIS_ONE.txt', c: 'Old customer PIN: ' + decoy + '\nChanged it. Too obvious.' },
    { n: 'diary.txt', c: 'Dear diary,\nToday a very nice person from a call center rang.\nI think we are friends now.' },
    { n: 'taxes_FINAL_v7.xls', kind: 'xls', c: '#REF!  #REF!  #REF!\n#REF!  42  #REF!' },
    T.file || { n: 'recipes', kind: 'dir', c: 'toast.txt\ntoast_v2.txt\ntoast_FINAL.txt' }
  ]);
  /* look: everything portraitSVG needs */
  const old = age > 64, A = a => pick(a);
  const look = {
    skin: A(SKINS), hair: A(T.hairCol || (old ? GREYS : HAIRS)), style: A(T.hair || HAIR_STYLES), face: A(T.face || ['oval', 'round', 'long', 'square', 'heart']),
    glasses: A(T.glasses || ['none', 'none', 'none', 'none', 'round', 'square']), beard: A(T.beard || ['none', 'none', 'none', 'stache', 'stubble', 'full', 'goatee']),
    freckles: Math.random() < (T.freckles || 0.18), wrinkles: Math.random() < (T.wrinkles || (old ? 0.8 : 0)), lashes: !!T.lashes, lips: T.lips ? A(T.lips) : null,
    nose: A(['button', 'button', 'round', 'long']), brow: 3.4 + Math.random() * 2.4, wide: !!T.wide, hat: T.hat || null,
    outfit: T.outfit || A(['tee', 'tee', 'hoodie', 'cardigan', 'plaid', 'blouse']), shirt: A(T.colors || SHIRT_COLS),
    pearls: !!T.pearls, chain: !!T.chain, earrings: !!T.earrings || (T.id === 'regular' && Math.random() < 0.15), ringlight: !!T.ringlight, yarn: !!T.yarn,
    bandana: !!T.bandana, tiara: !!T.tiara, boa: !!T.boa, beautyMark: !!T.beautyMark, headband: !!T.headband, neckerchief: !!T.neckerchief
  };
  const L = {}; for (const k in p.L) L[k] = ((T.L && T.L[k]) || []).concat(p.L[k]);
  const yr = 2026 - age;
  return {
    first, last, name: first + ' ' + last, nick, title, full: (title ? title + ' ' : '') + first + ' "' + nick + '" ' + last,
    type: T.id, typeLabel: T.label, about: T.about || '', seed, persona: p, L, baiter,
    age, quirk: quirk.q, quirkL: quirk.L || null, pin, files, pet: { name: pet[0], kind: pet[1] },
    card: digits(4) + ' ' + digits(4), cvc: digits(3), gift: 'BONK-' + gc() + '-' + gc(), exp: String(randi(1, 12)).padStart(2, '0') + '/' + randi(27, 31),
    giftpin: digits(4), acct: digits(3) + ' ' + digits(3), bankpin: digits(4), otp: digits(6),
    ctz: 'CTZ-' + digits(4) + '-' + digits(2), dob: String(randi(1, 28)).padStart(2, '0') + '/' + String(randi(1, 12)).padStart(2, '0') + '/' + yr,
    user: first.toLowerCase() + '.' + pick(['biscuit', 'turbo', 'pickle', 'moon', 'waffle', 'noodle', 'sparkle', 'thunder', 'kazoo']) + digits(2),
    pass: pick(['Pickles', 'Waffles', 'Gerald', 'Sunshine', 'Teapot', 'Spoons', 'Kazoo', 'Pancake', 'Moonboot']) + digits(3),
    bcode: 'BNK-' + digits(4), paw: 'PAW-' + digits(4) + '-' + digits(2), petmid: pick(PET_MID),
    nosy: digits(3) + '-' + digits(3),
    trust0: clamp(randi(p.trust[0], p.trust[1]) - Math.min(10, (dayN - 1) * 2) + (baiter ? 12 : 0), 12, 80),
    pitch: clamp(p.pitch + (T.pitch || 0) + rand(-0.12, 0.12), 0.5, 1.8), rate: clamp(p.rate + (T.rate || 0) + rand(-0.08, 0.08), 0.7, 1.4),
    look
  };
}
function moodOf(trust) { return trust < 25 ? 'angry' : trust < 45 ? 'wary' : trust < 68 ? 'neutral' : 'trusting'; }
const MOOD_LABEL = { angry: 'Angry', wary: 'Suspicious', neutral: 'Neutral', trusting: 'Trusting' };
const MOOD_COLOR = { angry: '#ff4a42', wary: '#ff9f1c', neutral: '#4ea4ff', trusting: '#2fd47a' };

/* ---------- cartoon portraits: chunky outlines, flat colours, mood expressions, themed accessories ----------
   portraitSVG(caller, mood, talking)  mood: angry | wary | neutral | trusting.
   The mouth is drawn twice: .mo-a (mood mouth) and .mo-b (open, hidden); a parent with class "talk"
   flips between them with CSS (see css/phone.css) so a speaking caller animates without re-rendering. */
const PT = {
  o: '#14171f', n: 0,
  hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); },
  mix(a, b, t) { const A = this.hex(a), B = this.hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); },
  E: (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`,
  /* outlined union of circles: one thick dark pass, then the fills (no inner lines) */
  blob(cs, fill, w = 7) {
    const c = cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
    return `<g fill="${this.o}" stroke="${this.o}" stroke-width="${w}">${c}</g><g fill="${fill}">${c}</g>`;
  },
  P(d, fill, sw = 3.5, extra = '') { return `<path d="${d}" fill="${fill}" stroke="${this.o}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`; },
  L(d, sw = 3.5, col) { return `<path d="${d}" fill="none" stroke="${col || this.o}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`; },
  FACES: { oval: { rx: 32, ry: 37, cy: 64 }, round: { rx: 36, ry: 35, cy: 65 }, long: { rx: 29, ry: 39, cy: 64 }, square: { rx: 33, ry: 36, cy: 64 }, heart: { rx: 34, ry: 37, cy: 64 } },
  facePath(shape, f) {
    if (shape === 'square') return 'M27 56Q27 28 60 28Q93 28 93 56V78Q93 101 60 101Q27 101 27 78Z';
    if (shape === 'heart') return 'M26 58Q26 27 60 27Q94 27 94 58Q94 80 80 92Q70 101 60 101Q50 101 40 92Q26 80 26 58Z';
    return this.E(60, f.cy, f.rx, f.ry);
  },
  /* hair: [back layer, front layer], designed for a head ~64 wide with its top at y≈27 */
  hair(style, hc) {
    const P = (d, sw) => this.P(d, hc, sw), arc = (a0, a1, n, cx, cy, rx, ry, r) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([+(cx + rx * Math.cos(a)).toFixed(1), +(cy + ry * Math.sin(a)).toFixed(1), r]); } return o; };
    const short = P('M27 60Q22 24 60 21Q98 24 93 60Q90 44 80 39Q66 46 46 38Q33 44 27 60Z');
    switch (style) {
      case 'short': return ['', short];
      case 'side': return ['', P('M27 62Q21 22 62 20Q101 22 93 58Q91 40 79 35Q58 30 42 44Q31 52 27 62Z')];
      case 'buzz': return ['', `<path d="M28 54Q26 26 60 24Q94 26 92 54Q88 40 60 37Q32 40 28 54Z" fill="${hc}" stroke="${this.o}" stroke-width="2.5" opacity=".92"/>`];
      case 'quiff': return ['', P('M27 58Q23 28 46 24Q54 6 80 9Q97 13 92 27Q97 38 93 58Q88 42 74 38Q56 42 41 39Q31 45 27 58Z')];
      case 'curly': return ['', this.blob(arc(180, 360, 8, 60, 52, 33, 27, 9.5).concat([[60, 36, 20], [42, 40, 12], [78, 40, 12]]), hc)];
      case 'afro': return [this.blob(arc(0, 360, 14, 60, 50, 38, 34, 13).concat([[60, 50, 38]]), hc), P('M30 52Q34 34 60 32Q86 34 90 52Q80 42 60 42Q40 42 30 52Z', 2.5)];
      case 'bun': return [this.blob([[60, 16, 12]], hc), P('M28 56Q24 25 60 23Q96 25 92 56Q86 40 60 37Q34 40 28 56Z')];
      case 'long': return [P('M22 104Q12 34 60 21Q108 34 98 104H86Q92 52 60 42Q28 52 34 104Z'), P('M27 60Q22 22 60 20Q98 22 93 60Q86 40 64 36Q50 46 36 44Q30 50 27 60Z')];
      case 'wavy': return [this.blob([[26, 46, 14], [21, 62, 13], [23, 78, 13], [27, 94, 12], [94, 46, 14], [99, 62, 13], [97, 78, 13], [93, 94, 12], [60, 32, 30]], hc), P('M27 60Q20 20 62 19Q102 22 93 58Q88 36 70 34Q60 46 40 42Q31 48 27 60Z')];
      case 'pony': return [P('M82 30Q110 24 108 58Q106 80 96 90Q100 62 86 44Z'), short];
      case 'mohawk': return ['', `<path d="M28 54Q26 28 60 26Q94 28 92 54Q88 42 60 39Q32 42 28 54Z" fill="${hc}" opacity=".35"/>` + P('M53 37L49 6L57 15L61 1L66 15L74 5L70 37Q61 41 53 37Z', 3)];
      case 'puffs': return [this.blob([[27, 52, 10], [22, 64, 9], [30, 41, 9], [93, 52, 10], [98, 64, 9], [90, 41, 9]], hc), ''];
      case 'horseshoe': return [this.blob([[27, 64, 7], [29, 54, 6.5], [93, 64, 7], [91, 54, 6.5]], hc), ''];
      case 'pigtails': return [this.blob([[19, 72, 11], [101, 72, 11]], hc), short];
      default: return ['', ''];
    }
  },
  outfit(L, sk) {
    const c = L.shirt, o = this.o, P = (d, f, sw) => this.P(d, f, sw);
    const base = 'M6 124Q10 102 40 99Q50 106 60 106Q70 106 80 99Q110 102 114 124Z';
    switch (L.outfit) {
      case 'tank': return P('M0 124Q2 96 36 93Q48 104 60 104Q72 104 84 93Q118 96 120 124Z', sk) + P('M36 124L40 102Q60 114 80 102L84 124Z', c) + this.L('M44 101V124M76 101V124', 2, PT.mix(c, '#000', 0.25));
      case 'hoodie': return P(base, c) + P('M38 100Q60 120 82 100', 'none', 4) + this.L('M54 108V120M66 108V120', 2.5) + `<circle cx="54" cy="121" r="2" fill="${o}"/><circle cx="66" cy="121" r="2" fill="${o}"/>`;
      case 'cardigan': return P(base, c) + P('M47 102L60 124L73 102Q66 106 60 106Q54 106 47 102Z', '#f4efe2', 3) + `<circle cx="70" cy="114" r="2.2" fill="${o}"/><circle cx="67" cy="121" r="2.2" fill="${o}"/>`;
      case 'plaid': return P(base, c) + this.L('M24 108V124M40 104V124M80 104V124M96 108V124M14 113H106M12 120H108', 2.4, 'rgba(0,0,0,.28)') + P('M48 102L60 113L72 102', 'none', 3);
      case 'suit': return P(base, '#e9edf2') + `<ellipse cx="60" cy="104" rx="30" ry="7" fill="#c3cad4" stroke="${o}" stroke-width="3.5"/>` + `<rect x="78" y="110" width="12" height="8" rx="2" fill="#2f6fd6" stroke="${o}" stroke-width="2"/><path d="M84 111.5l1 2.2 2.3.2-1.8 1.4.6 2.2-2.1-1.3-2.1 1.3.6-2.2-1.8-1.4 2.3-.2z" fill="#fff"/>`;
      case 'chef': return P(base, '#fbfbfb') + [48, 72].map(x => `<circle cx="${x}" cy="113" r="2.4" fill="${o}"/><circle cx="${x}" cy="121" r="2.4" fill="${o}"/>`).join('');
      case 'captain': return P(base, c) + P('M50 104L60 116L70 104', '#fff', 3) + `<rect x="14" y="104" width="18" height="6" rx="2" fill="#f2c94c" stroke="${o}" stroke-width="2.5" transform="rotate(-14 23 107)"/><rect x="88" y="104" width="18" height="6" rx="2" fill="#f2c94c" stroke="${o}" stroke-width="2.5" transform="rotate(14 97 107)"/>` + [113, 121].map(y => `<circle cx="60" cy="${y}" r="2.4" fill="#f2c94c" stroke="${o}" stroke-width="1.5"/>`).join('');
      case 'labcoat': return P(base, '#fbfbfb') + P('M46 102L60 120L74 102Q66 106 60 106Q54 106 46 102Z', '#7fb2e6', 3) + this.L('M46 102L52 124M74 102L68 124', 2.5) + `<rect x="80" y="110" width="12" height="9" fill="none" stroke="${o}" stroke-width="2"/><path d="M83 106v6M87 105v7" stroke="#d64545" stroke-width="2.4"/>`;
      case 'blouse': return P(base, c) + P('M44 101Q50 112 60 107Q70 112 76 101Q68 106 60 106Q52 106 44 101Z', '#fff', 3);
      case 'jacket': return P(base, c) + P('M46 101L56 118L60 106L64 118L74 101Q66 106 60 106Q54 106 46 101Z', PT.mix(c, '#000', 0.3), 3);
      default: return P(base, c) + this.L('M48 102Q60 112 72 102', 3);
    }
  },
  hat(L, f) {
    const o = this.o, P = (d, fl, sw) => this.P(d, fl, sw);
    const star = (x, y, r) => `<path d="M${x} ${y - r}l${r * .3} ${r * .7} ${r * .7} ${r * .3} -${r * .7} ${r * .3} -${r * .3} ${r * .7} -${r * .3} -${r * .7} -${r * .7} -${r * .3} ${r * .7} -${r * .3}z" fill="#ffe066"/>`;
    switch (L.hat) {
      case 'wizard': return P('M22 38Q30 30 50 26Q52 12 62 4Q74 -2 88 4Q76 8 72 18Q70 26 74 30Q94 32 100 40Q62 50 22 38Z', '#6d3fc0', 3.5) + P('M34 33Q60 40 88 32L86 26Q60 33 36 27Z', '#ffd43b', 2.5) + star(58, 16, 4.5) + star(76, 10, 3) + star(46, 24, 2.6);
      case 'cowboy': return P('M38 34Q36 12 48 12Q56 16 60 16Q64 16 72 12Q84 12 82 34Z', '#9c6a3c', 3.5) + P('M40 28Q60 34 80 28L81 33Q60 39 39 33Z', '#4a2f1b', 2.5) + P('M8 36Q20 46 60 44Q100 46 112 36Q104 30 90 34Q60 41 30 34Q16 30 8 36Z', '#b07a46', 3.5);
      case 'chef': return this.blob([[44, 18, 13], [60, 11, 15], [76, 18, 13]], '#ffffff', 7) + P('M36 22H84V38Q60 42 36 38Z', '#ffffff', 3.5) + this.L('M48 26V36M60 25V37M72 26V36', 1.8, '#c7cdd6');
      case 'captain': return P('M26 34Q20 14 60 12Q100 14 94 34Z', '#ffffff', 3.5) + P('M28 31H92V40Q60 44 28 40Z', '#1f2f5c', 3) + P('M30 40Q60 54 92 40Q60 47 30 40Z', '#14171f', 2.5) + `<circle cx="60" cy="29" r="5" fill="#f2c94c" stroke="${o}" stroke-width="2"/><path d="M60 26.5v5M58 29h4" stroke="${o}" stroke-width="1.4"/>`;
      case 'cap': return P('M27 46Q26 18 60 18Q94 18 93 46Q60 38 27 46Z', L.shirt, 3.5) + P('M62 42Q92 34 112 44Q98 52 70 48Z', PT.mix(L.shirt, '#000', 0.25), 3.5) + `<circle cx="60" cy="19" r="3" fill="${o}"/>`;
      case 'tinfoil': return P('M26 42L44 6L50 14L58 -2L66 12L74 3L94 42Q60 50 26 42Z', '#cfd6df', 3.5) + this.L('M44 6L46 40M58 -2L58 44M74 3L72 42', 1.6, '#8d97a5') + this.L('M36 30L52 20M64 30L80 22M40 40L50 32', 1.6, '#ffffff');
      case 'flatcap': return P('M26 44Q24 22 60 20Q96 22 97 38Q106 42 100 47Q62 52 26 44Z', '#8b7355', 3.5) + this.L('M34 36Q60 30 92 36M38 28Q60 24 84 28', 1.8, 'rgba(0,0,0,.3)');
      case 'goggles': return this.L('M26 40Q60 30 94 40', 6, '#5a4632') + `<circle cx="46" cy="36" r="9" fill="#9fe0f2" stroke="${o}" stroke-width="3.5"/><circle cx="74" cy="36" r="9" fill="#9fe0f2" stroke="${o}" stroke-width="3.5"/><path d="M42 32l4-3M70 32l4-3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
      default: return '';
    }
  }
};
function portraitSVG(c, mood, talking) {
  const L = c.look || {}, o = PT.o, f = PT.FACES[L.face] || PT.FACES.oval, helmet = L.hat === 'helmet';
  if (!['angry', 'wary', 'neutral', 'trusting'].includes(mood)) mood = 'neutral';
  const sk = mood === 'angry' ? PT.mix(L.skin || '#f6d3b3', '#ff3b30', 0.2) : (L.skin || '#f6d3b3'), hc = L.hair || '#4a3323';
  const k = f.rx / 32, sx = d => `<g transform="translate(60 0) scale(${k.toFixed(3)} 1) translate(-60 0)">${d}</g>`;
  const ex = Math.round(13 * k), ey = f.cy - 1, my = f.cy + 22, browC = PT.mix(hc, o, 0.45);
  const covered = ['wizard', 'cowboy', 'chef', 'captain', 'tinfoil', 'flatcap', 'cap'].includes(L.hat);
  let hair = helmet ? ['', ''] : PT.hair(covered && !['puffs', 'horseshoe', 'long', 'wavy', 'pigtails', 'pony'].includes(L.style) ? 'none' : L.style, hc);
  if (covered && ['long', 'wavy', 'pigtails', 'pony'].includes(L.style)) hair[1] = '';
  let s = '';
  /* background bits */
  if (L.ringlight) s += `<circle cx="60" cy="60" r="51" fill="#fff" opacity=".18"/><circle cx="60" cy="60" r="51" fill="none" stroke="#fff" stroke-width="14" opacity=".22"/><circle cx="60" cy="60" r="51" fill="none" stroke="#fffdf5" stroke-width="5"/>`;
  if (helmet) s += `<circle cx="60" cy="62" r="47" fill="#eef1f5" stroke="${o}" stroke-width="4"/><circle cx="60" cy="63" r="39" fill="#bcd3e0"/>`;
  s += sx(hair[0]);
  s += `<rect x="51" y="88" width="18" height="20" fill="${sk}" stroke="${o}" stroke-width="3.5"/>`;
  s += PT.outfit(L, L.skin || '#f6d3b3');
  if (L.pearls) for (let i = 0; i <= 6; i++) { const t = i / 6, x = 44 + 32 * t, y = 103 + Math.sin(t * Math.PI) * 8; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#fff" stroke="${o}" stroke-width="1.2"/>`; }
  if (L.chain) s += PT.L('M44 102Q60 122 76 102', 3, '#f2c230') + `<circle cx="60" cy="114" r="5.5" fill="#ffd43b" stroke="${o}" stroke-width="2"/><text x="60" y="117.3" font-size="8" font-family="Lilita One,sans-serif" text-anchor="middle" fill="${o}">D</text>`;
  if (L.bandana) s += PT.P('M44 100L76 100L60 117Z', '#d63a3a', 3) + `<circle cx="55" cy="104" r="1.3" fill="#fff"/><circle cx="64" cy="103" r="1.3" fill="#fff"/><circle cx="60" cy="109" r="1.3" fill="#fff"/>`;
  if (L.neckerchief) s += PT.P('M50 100H70L65 108H55Z', '#e03131', 2.5) + PT.P('M56 107L60 117L64 107Z', '#e03131', 2.5);
  if (L.boa) s += PT.blob([[14, 116, 8], [24, 108, 8], [36, 104, 7.5], [46, 108, 7], [74, 108, 7], [84, 104, 7.5], [96, 108, 8], [106, 116, 8]], '#ff8cc6', 5);
  /* ears */
  if (!helmet) {
    const eL = 60 - f.rx + 1, eR = 60 + f.rx - 1;
    s += `<circle cx="${eL}" cy="${f.cy + 4}" r="7" fill="${sk}" stroke="${o}" stroke-width="3.5"/><circle cx="${eR}" cy="${f.cy + 4}" r="7" fill="${sk}" stroke="${o}" stroke-width="3.5"/>`;
    if (L.earrings) s += `<circle cx="${eL - 1}" cy="${f.cy + 15}" r="5" fill="none" stroke="#f2c230" stroke-width="2.6"/><circle cx="${eR + 1}" cy="${f.cy + 15}" r="5" fill="none" stroke="#f2c230" stroke-width="2.6"/>`;
  }
  /* face */
  s += `<path d="${PT.facePath(L.face, f)}" fill="${sk}" stroke="${o}" stroke-width="4"/>`;
  if (L.beard === 'stubble') s += `<path d="M${60 - f.rx + 3} ${f.cy + 8}Q${60 - f.rx + 6} ${f.cy + f.ry - 2} 60 ${f.cy + f.ry - 1}Q${60 + f.rx - 6} ${f.cy + f.ry - 2} ${60 + f.rx - 3} ${f.cy + 8}Q74 ${my - 6} 60 ${my - 7}Q46 ${my - 6} ${60 - f.rx + 3} ${f.cy + 8}Z" fill="${hc}" opacity=".28"/>`;
  if (L.wrinkles) s += PT.L(`M47 40Q60 37 73 40M50 45Q60 43 70 45`, 1.8, 'rgba(0,0,0,.28)');
  s += sx(hair[1]);
  /* cheeks, freckles, wrinkles */
  if (mood === 'trusting' || L.lips) s += `<ellipse cx="${60 - ex - 6}" cy="${my - 8}" rx="6" ry="3.6" fill="#ff5f7e" opacity="${mood === 'trusting' ? 0.42 : 0.25}"/><ellipse cx="${60 + ex + 6}" cy="${my - 8}" rx="6" ry="3.6" fill="#ff5f7e" opacity="${mood === 'trusting' ? 0.42 : 0.25}"/>`;
  if (L.freckles) { const fc = PT.mix(L.skin || '#f6d3b3', '#6b3a1e', 0.45); for (const [dx, dy] of [[-17, 10], [-13, 13], [-20, 14], [17, 10], [13, 13], [20, 14]]) s += `<circle cx="${60 + dx}" cy="${ey + dy}" r="1.2" fill="${fc}"/>`; }
  if (L.wrinkles) s += PT.L(`M${60 - ex - 10} ${ey - 2}l-4 -2M${60 - ex - 10} ${ey + 2}l-4 2M${60 + ex + 10} ${ey - 2}l4 -2M${60 + ex + 10} ${ey + 2}l4 2M${60 - ex - 5} ${ey + 11}q5 3 10 0M${60 + ex - 5} ${ey + 11}q5 3 10 0`, 1.6, 'rgba(0,0,0,.32)');
  if (L.beautyMark) s += `<circle cx="${60 + ex + 4}" cy="${my - 3}" r="1.6" fill="${o}"/>`;
  /* eyes */
  const ew = L.wide ? 8.4 : 7, eh = L.wide ? 9.6 : 8.2;
  const eye = (x, side) => {
    if (mood === 'trusting') return PT.L(`M${x - 6.5} ${ey + 2}q6.5-9 13 0`, 3.6);
    const px = mood === 'wary' ? 2.8 : mood === 'angry' ? -side * 1.4 : 0, py = mood === 'neutral' ? 0.6 : 0.3;
    let e = `<ellipse cx="${x}" cy="${ey}" rx="${ew}" ry="${eh}" fill="#fff" stroke="${o}" stroke-width="2.8"/><circle cx="${x + px}" cy="${ey + py}" r="${L.wide ? 3 : 3.7}" fill="${o}"/><circle cx="${x + px + 1.3}" cy="${ey + py - 1.4}" r="1.15" fill="#fff"/>`;
    if (mood === 'angry') e += `<path d="M${x - 10} ${ey - 12}H${x + 10}V${ey - 1.2}L${x - 10} ${ey - 7.5}Z" transform="${side > 0 ? `translate(${2 * x} 0) scale(-1 1)` : ''}" fill="${sk}"/>` + PT.L(side < 0 ? `M${x - 8.6} ${ey - 6.4}L${x + 8.6} ${ey - 1.6}` : `M${x + 8.6} ${ey - 6.4}L${x - 8.6} ${ey - 1.6}`, 3);
    if (mood === 'wary') e += `<path d="M${x - 10} ${ey - 12}H${x + 10}V${ey - 2.2}H${x - 10}Z" fill="${sk}"/>` + PT.L(`M${x - ew + 0.6} ${ey - 2.2}H${x + ew - 0.6}`, 3);
    if (L.lashes) e += PT.L(`M${x + side * (ew - 1)} ${ey - eh + 3}l${side * 3.5} -3M${x + side * (ew - 3.5)} ${ey - eh + 0.8}l${side * 2.4} -3.4`, 2.2);
    return e;
  };
  s += eye(60 - ex, -1) + eye(60 + ex, 1);
  /* brows */
  const by = ey - 13, bw = L.brow || 4.2, brow = (x, side, i) => {
    const ox = x + side * 8.5, ix = x - side * 8.5;
    const d = mood === 'angry' ? `M${ox} ${by - 4}L${ix} ${by + 3.5}`
      : mood === 'wary' ? (i ? `M${ox} ${by + 2.5}L${ix} ${by + 2}` : `M${ox} ${by + 1}Q${x} ${by - 7} ${ix} ${by - 1}`)
      : mood === 'trusting' ? `M${ox} ${by - 1}Q${x} ${by - 8} ${ix} ${by - 2}` : `M${ox} ${by + 1}Q${x} ${by - 3.5} ${ix} ${by + 1}`;
    return PT.L(d, bw, browC);
  };
  s += brow(60 - ex, -1, 0) + brow(60 + ex, 1, 1);
  /* nose */
  s += L.nose === 'round' ? `<circle cx="60" cy="${ey + 11}" r="4.6" fill="${PT.mix(sk, '#b0533a', 0.18)}" stroke="${o}" stroke-width="2.5"/>`
    : L.nose === 'long' ? PT.L(`M60 ${ey + 3}l-5 13q4 3 8 1`, 2.8) : PT.L(`M59 ${ey + 8}q-4.5 6 2 7.5`, 2.8);
  /* beards under the mouth */
  if (L.beard === 'full') s += PT.P(`M${60 - f.rx + 2} ${f.cy + 4}Q${60 - f.rx + 2} ${f.cy + f.ry + 8} 60 ${f.cy + f.ry + 7}Q${60 + f.rx - 2} ${f.cy + f.ry + 8} ${60 + f.rx - 2} ${f.cy + 4}Q${60 + f.rx - 6} ${my - 2} 72 ${my - 5}Q60 ${my - 9} 48 ${my - 5}Q${60 - f.rx + 6} ${my - 2} ${60 - f.rx + 2} ${f.cy + 4}Z`, hc, 3.5);
  if (L.beard === 'goatee') s += PT.P(`M53 ${my + 6}Q60 ${my + 20} 67 ${my + 6}Q60 ${my + 9} 53 ${my + 6}Z`, hc, 2.8);
  /* mouths */
  const lip = L.lips || o, lw = L.lips ? 4.6 : 3.6;
  const open = sh => `<path d="M${60 - 8 - sh} ${my - 3}Q60 ${my - 6} ${60 + 8 + sh} ${my - 3}Q${60 + 8 + sh} ${my + 11 + sh} 60 ${my + 11 + sh}Q${60 - 8 - sh} ${my + 11 + sh} ${60 - 8 - sh} ${my - 3}Z" fill="#5b1a1a" stroke="${L.lips || o}" stroke-width="3.2" stroke-linejoin="round"/><ellipse cx="60" cy="${my + 7 + sh * .6}" rx="${5 + sh * .4}" ry="2.8" fill="#ff7a8a"/>`;
  const moods = {
    angry: `<rect x="46" y="${my - 4}" width="28" height="10" rx="4" fill="#fff" stroke="${o}" stroke-width="3"/>` + PT.L(`M47 ${my + 1}H73M53 ${my - 3.5}V${my + 5.5}M60 ${my - 3.5}V${my + 5.5}M67 ${my - 3.5}V${my + 5.5}`, 1.6),
    wary: PT.L(`M49 ${my + 1}q5.5-4 11 0t11-1`, lw, lip),
    neutral: PT.L(`M48 ${my - 1}q12 8 24 0`, lw, lip),
    trusting: `<path d="M45 ${my - 4}Q60 ${my - 2} 75 ${my - 4}Q73 ${my + 14} 60 ${my + 14}Q47 ${my + 14} 45 ${my - 4}Z" fill="#5b1a1a" stroke="${L.lips || o}" stroke-width="3.2" stroke-linejoin="round"/><path d="M47.5 ${my - 2.5}Q60 ${my - 1} 72.5 ${my - 2.5}L72 ${my + 1.5}Q60 ${my + 3} 48 ${my + 1.5}Z" fill="#fff"/><ellipse cx="60" cy="${my + 9.5}" rx="6" ry="3" fill="#ff7a8a"/>`
  };
  s += `<g class="mo-a">${talking ? open(mood === 'angry' ? 3 : 0) : moods[mood]}</g><g class="mo-b" opacity="0">${open(mood === 'angry' ? 3 : 0)}</g>`;
  /* moustaches over the mouth */
  if (L.beard === 'stache') s += PT.P(`M46 ${my - 6}Q53 ${my - 11} 60 ${my - 8}Q67 ${my - 11} 74 ${my - 6}Q67 ${my - 3} 60 ${my - 5}Q53 ${my - 3} 46 ${my - 6}Z`, hc, 2.6);
  if (L.beard === 'handlebar') s += PT.P(`M38 ${my - 10}Q40 ${my - 3} 46 ${my - 5}Q53 ${my - 11} 60 ${my - 8}Q67 ${my - 11} 74 ${my - 5}Q80 ${my - 3} 82 ${my - 10}Q84 ${my - 2} 74 ${my - 1}Q67 ${my - 3} 60 ${my - 4}Q53 ${my - 3} 46 ${my - 1}Q36 ${my - 2} 38 ${my - 10}Z`, hc, 2.6);
  if (L.beard === 'walrus' || (L.beard === 'full')) s += PT.P(`M44 ${my - 4}Q50 ${my - 12} 60 ${my - 9}Q70 ${my - 12} 76 ${my - 4}Q74 ${my + 2} 70 ${my - 1}Q66 ${my + 3} 60 ${my}Q54 ${my + 3} 50 ${my - 1}Q46 ${my + 2} 44 ${my - 4}Z`, hc, 2.6);
  /* mood marks */
  if (mood === 'angry') s += PT.L(`M${60 + f.rx - 14} 36q4 4 0 8M${60 + f.rx - 4} 36q-4 4 0 8M${60 + f.rx - 13} 35q4 4 8 0M${60 + f.rx - 13} 45q4 -4 8 0`, 2.6, '#e8202a');
  if (mood === 'wary') s += `<path d="M${60 - f.rx + 4} 44q-5 7 0 10q5-3 0-10z" fill="#9edcff" stroke="${o}" stroke-width="2"/>`;
  /* glasses */
  const gx = ex, g = L.glasses;
  if (g === 'round') s += `<circle cx="${60 - gx}" cy="${ey}" r="10.5" fill="#fff" fill-opacity=".14" stroke="${o}" stroke-width="3"/><circle cx="${60 + gx}" cy="${ey}" r="10.5" fill="#fff" fill-opacity=".14" stroke="${o}" stroke-width="3"/>` + PT.L(`M${60 - gx + 10.5} ${ey - 1}Q60 ${ey - 5} ${60 + gx - 10.5} ${ey - 1}M${60 - gx - 10.5} ${ey - 2}L${60 - f.rx + 2} ${ey - 4}M${60 + gx + 10.5} ${ey - 2}L${60 + f.rx - 2} ${ey - 4}`, 2.8);
  if (g === 'square') s += `<rect x="${60 - gx - 11}" y="${ey - 8}" width="22" height="16" rx="4" fill="#fff" fill-opacity=".14" stroke="${o}" stroke-width="3"/><rect x="${60 + gx - 11}" y="${ey - 8}" width="22" height="16" rx="4" fill="#fff" fill-opacity=".14" stroke="${o}" stroke-width="3"/>` + PT.L(`M${60 - gx + 11} ${ey - 2}H${60 + gx - 11}M${60 - gx - 11} ${ey - 3}L${60 - f.rx + 2} ${ey - 5}M${60 + gx + 11} ${ey - 3}L${60 + f.rx - 2} ${ey - 5}`, 2.8);
  if (g === 'shades') s += PT.P(`M${60 - gx - 13} ${ey - 7}H${60 - 3}Q${60 - 4} ${ey + 9} ${60 - gx} ${ey + 9}Q${60 - gx - 12} ${ey + 9} ${60 - gx - 13} ${ey - 7}ZM${60 + 3} ${ey - 7}H${60 + gx + 13}Q${60 + gx + 12} ${ey + 9} ${60 + gx} ${ey + 9}Q${60 + 4} ${ey + 9} ${60 + 3} ${ey - 7}Z`, '#1b2230', 3) + PT.L(`M${60 - 3} ${ey - 5}H${60 + 3}`, 3) + PT.L(`M${60 - gx - 8} ${ey - 3}l5 0M${60 + gx - 3} ${ey - 3}l5 0`, 2.2, '#8fa3c7');
  /* hats and front accessories */
  if (L.headband) s += sx(PT.P('M28 44Q60 30 92 44L92 51Q60 38 28 51Z', '#e8202a', 3) + PT.L('M30 47.5Q60 34.5 90 47.5', 1.8, '#fff'));
  if (L.tiara) s += PT.P('M44 30L48 20L54 27L60 15L66 27L72 20L76 30Q60 26 44 30Z', '#ffd43b', 2.5) + `<circle cx="60" cy="24" r="2.6" fill="#4dabf7" stroke="${o}" stroke-width="1.5"/>`;
  s += PT.hat(L, f);
  if (helmet) s += `<circle cx="60" cy="64" r="39" fill="#7fe0ff" opacity=".24" stroke="#aab6c4" stroke-width="3.5"/>` + PT.L('M31 50Q36 32 54 27', 4, 'rgba(255,255,255,.85)') + PT.L('M34 62Q34 57 36 53', 3, 'rgba(255,255,255,.6)') + `<rect x="9" y="56" width="8" height="16" rx="3" fill="#c3cad4" stroke="${o}" stroke-width="3"/><rect x="103" y="56" width="8" height="16" rx="3" fill="#c3cad4" stroke="${o}" stroke-width="3"/>`;
  if (L.yarn) s += `<path d="M86 124L114 92M94 124L118 98" stroke="#c78f4b" stroke-width="3" stroke-linecap="round"/><circle cx="102" cy="112" r="12" fill="#f06595" stroke="${o}" stroke-width="3.5"/>` + PT.L('M92 106q10 4 18 -2M91 113q11 5 22 -2M96 121q6-8 4-20', 1.8, '#a61e4d');
  return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
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
