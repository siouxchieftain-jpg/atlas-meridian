import type { CriterionId, SectionId } from '../content/types';

/**
 * Informasjonsguiden and the margin «Hva DPS ser etter» read text live: which of the five
 * GP-documentable criteria a text mentions, in Norwegian and English. The screen says «Ikke funnet
 * ennå», never that something is missing, and «Omtalt» never says that what is written is enough.
 *
 * A referral is read section by section: a criterion counts only in the section whose margin looks
 * for it, so the guide's count and the margins always agree, and words that belong to another
 * section («Depresjon i familien» under Tidligere behandling) never count as function (r4F-02).
 * - «Tidligere behandling», «Funksjonsfall» and «Risikovurdering» look for one criterion each, so
 *   what the GP writes there counts, unless it says that the criterion was not assessed, is unknown
 *   or is left to DPS, or only points elsewhere; under risk, a risk that is not to life and health
 *   does not count either (r6F-01). Nor does a clause about the consultation, a test, a diagnosis,
 *   a somatic illness, the referral or a wish for treatment, or, under risk, about everyday symptoms
 *   or daily life (r7F-01); under «Tidligere behandling», a plan, this referral or treatment of a
 *   somatic illness is not mental health care that was given (r9F-02), and nor is a clause that only names
 *   an illness (r10F-03). This is read by the shape of
 *   a clause, not by meaning, so it can be wrong both ways; DECISIONS G-06 holds the rates measured
 *   on wording the reader had never seen.
 * - «Aktuelt og problemstilling» looks for severity and duration, so it is read for the words
 *   clinicians commonly use (R2V-01, R3F-01, r4F-01) and can miss a wording of its own.
 * A note has no sections and is read for words, like «Aktuelt». The reading never blocks anything
 * and never scores.
 */

/** No letter right before: the start of a word. JavaScript's \b ignores æ, ø and å (R3F-05). */
const start = (s: string) => `(?<!\\p{L})(?:${s})`;
/** A whole word: no letter right before or after. */
const word = (s: string) => `(?<!\\p{L})(?:${s})(?!\\p{L})`;
const anyOf = (...parts: string[]) => new RegExp(parts.join('|'), 'iu');

/** Numbers and quantity words that make «år», «dager» (and English «years», «days») a duration. */
const NB_QTY = '\\d+(?:[,.]\\d+)?|ett|et|en|to|tre|fire|fem|seks|sju|syv|åtte|ni|ti|elleve|tolv|femten|tjue|flere|noen|mange|par|halvt|halvannet';
const EN_QTY = '\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|several|few|many|couple of';
const NB_MONTHS = 'januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember';
const EN_MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';

const PATTERNS: Record<CriterionId, RegExp> = {
  alvorlighet: anyOf(
    // Scores, then severity, mood, anxiety and psychosis words and diagnoses, Norwegian.
    start('phq|gad|madrs|hads|bdi|ybocs'),
    start(
      'alvorlig|moderat|mild|kraftig|intens|humørsving|nedstemt|nedtrykt|deprim|depres|stemningsleie|tungsinn|trist|gråt|håpløs|engstel|panikk|tvangs|psykos|psykot|' +
        'hallusin|hører stemmer|hørt stemmer|vrangforestill|paranoi|usammenheng|desorganis|manisk|hypoman|bipolar|ptsd|posttraumatisk|' +
        'spiseforstyrr|anoreksi|bulimi|personlighetsforstyrr|emosjonelt ustabil|anhedoni|psykomotor|hemning|hemmet',
    ),
    // Symptoms that say how heavy the illness is: sleep, nightmares, rumination, concentration, energy, symptom burden (r6F-03).
    start(
      'matinntak|vekttap|(?:gått|gikk)\\s+ned\\s+(?:\\d+(?:[,.]\\d+)?|\\p{L}+)\\s*(?:kg|kilo)|store\\s+(?:plager|problemer|vansker)|' +
        'søvn|innsovning|oppvåkning|insomni|sove|sover|mareritt|flashback|grubl|konsentrasjon|hukommelse|energi|initiativ|tiltaksløs|apati|appetitt|' +
        'urolig|uro(?:en)?(?!\\p{L})|rastløs|irritabel|symptomtrykk|symptombelastning|skyldfølelse|selvbebreid|verdiløs|utbrent|utbrenthet|bmi|' +
        'spiser (?:nesten )?(?:ingenting|lite|ikke)|affekt|traume|traumat|påtrengende|dissosi|raseri|nedfor|utslitt|utmattet|sliten|lettgradig|' +
        '(?:har|hatt|hadde)\\s+det\\s+(?:\\p{L}+\\s+)?(?:tungt|vondt|vanskelig|forferdelig|grusomt|jævlig|dårlig|fælt)|' +
        '(?:lette|lettere|milde|beskjedne|moderate|betydelige|uttalte|markerte|sterke|tunge)\\s+(?:plager|symptomer|vansker)|lidelsestrykk|lidelsespress|' +
        '(?:plage|symptom|vansk)\\p{L}*\\s+(?:(?:er|var|har\\s+blitt|ble|blir)\\s+)?(?:\\p{L}+\\s+){0,2}?(?:store|sterke|tunge|uttalte|betydelige|kraftige|lette|milde|beskjedne|uutholdelige)(?!\\p{L})|' +
        '(?:veldig|svært|meget|ekstremt|fryktelig|forferdelig)\\s+dårlig(?:\\s+(?:psykisk|nå))?(?=\\s*[.,;:!]?\\s*$)|(?:henger|hang)\\s+i\\s+en\\s+tynn\\s+tråd',
    ),
    // «angst» and «fobi» also at the end of a word: helseangst, sosialangst, agorafobi.
    'angst|fobi',
    // English.
    start(
      'severe|moderate|mild|intens|mood swing|major (?:problems|difficulties|symptoms)|low mood|depress|tearful|hopeless|anxiety|anxious|panic|phobi|obsessi|compulsi|psychos|psychot|hallucinat|' +
        'hears voices|heard voices|hearing voices|delusion|paranoi|incoheren|disorganis|disorganiz|manic|mania|hypoman|bipolar|ptsd|' +
        'post-traumatic|eating disorder|anorexi|bulimi|personality disorder|emotionally unstable|anhedoni|psychomotor',
    ),
    start(
      'food intake|weight loss|(?:lost|losing)\\s+(?:\\d+(?:\\.\\d+)?|\\w+)\\s*(?:kg|kilos?|stone|lbs?|pounds)|eating (?:very )?little|' +
        'sleep|insomnia|nightmare|flashback|ruminat|concentrat|memory|energy|motivation|initiative|apath|appetite|agitat|restless|irritab|' +
        'symptom burden|symptom load|(?:reduced|low|lack of|no|poor|lost) drive|guilt|worthless|burn(?:t|ed)? out|burnout|bmi|barely eating|not eating|' +
        'affect|trauma|intrusive|dissociat|rage|exhausted|low(?!\\s+(?:risk|dose|level))|end of (?:her|his|their|my) tether|' +
        '(?:really|badly|terribly) struggling|struggling (?:a lot|badly|terribly)|' +
        '(?:modest|minor|slight|significant|marked|considerable|substantial)\\s+(?:symptoms|problems|difficulties)|distress|' +
        '(?:swings?|fluctuations?)\\s+in\\s+(?:her\\s+|his\\s+|their\\s+)?mood|cried|cries|crying|in\\s+tears|' +
        'feel(?:s|ing)?\\s+(?:\\w+\\s+)?(?:awful|dreadful|terrible|horrendous|wretched|miserable|rotten)|' +
        '(?:symptoms?|problems?|difficulties)\\s+(?:(?:are|is|were|was|have\\s+been|has\\s+been|got|became|become)\\s+)?(?:\\w+\\s+){0,2}?(?:bad|severe|unbearable|intolerable|overwhelming)(?![a-z])|' +
        '(?:really|very|extremely|terribly)\\s+(?:bad|poorly|unwell)(?=\\s*[.,;:!]?\\s*$)|(?:hanging|holding)\\s+on\\s+by\\s+a\\s+thread',
    ),
    word('sad|sadness|ocd'),
  ),
  funksjon: anyOf(
    // Work, school and benefits. «arbeid» not in «samarbeid», «bearbeide» or «utarbeidet» (r4F-02).
    '(?<!sam|be|ut)arbeid|sykemeld|sykmeld|jobb|fravær|ufør|permitter|oppsagt|pensjon|skole|barnehage|studi|studer|student|eksamen|' +
      'forelesning|videregående|universitet|høyskole',
    start('stilling|deltid|heltid|fulltid|gaf|selvhjulpen|venn|aktiv|inaktiv'),
    word('aap|nav|adl|handle|handler inn|handlet inn|barn|barna|barnene'),
    // Everyday life, family and friends, self-care. «funksjon» not at the end of a word (stoffskiftefunksjon).
    start('funksjon'),
    'funger|hverdag|det daglige|dagliglivet|daglige (?:gjøremål|aktivitet)|sosial|fritid|hobby|kjøre|trene|trening|familie|' +
      'hjemme(?!besøk)|orker|klarer ikke|klarer seg|greier|greide|ivareta|ta vare på|omsorg for|omsorgsoppgav|egenomsorg|hygiene|dusj|' +
      'husarbeid|husholdning|matlaging|lage mat|lager mat|vaske|vasker|klesvask|oppvask|regning|(?:i|rundt) huset|rommet|kontor|' +
      'ute av stand|innkjøp|butikk|kjøpesenter|kollektiv|seg syk|henting|nettverk|alene|ser ingen|treffer ingen|mistet kontakt|' +
      'sover\\s+(?:\\p{L}+\\s+){0,2}?(?:hele\\s+dagen|mesteparten\\s+av\\s+dagen|til\\s+(?:langt\\s+)?på\\s+dag)|lage[r]?\\s+(?:ikke\\s+)?(?:\\p{L}+\\s+)?mat|' +
      'spiser\\s+(?:ikke|lite|dårlig|uregelmessig)|fotball|håndball|idrett|korps|svømming|lekser|skolearbeid|innlevering|' +
      'lite kontakt|få gjort|får ikke gjort|får ingenting gjort',
    start('vakt|buss|trikk|t-bane|sønn|datter'),
    word('posten|handling|handlingen'),
    // Withdrawal, avoidance and staying in.
    'trukket seg|tilbaketrukk|isoler|unngår|unngikk|unngåelse|ut av (?:huset|døra|døren|leiligheten|rommet)|' +
      '(?:går|kommer seg) (?:nesten |aldri )?(?:ikke|lite|sjelden) (?:ut|opp)|holder seg (?:mye |mest |bare )?inne|ikke (?:vært )?ute|' +
      'står (?:ikke |sjelden |sent )?opp|sofa|sengelig|til sengs|i senga|i sengen|møter ikke (?:på|opp)|mye borte|borte fra|(?:vært|var|er) borte(?!\\p{L})',
    // English. «work» at the start of a word (not «network»); «function» not of an organ (r4F-02).
    start('work|job|employ|unemploy|school|universit|college|student|lecture|sport|gym|class(?:es)?(?!\\p{L})'),
    '(?<!\\p{L})(?<!(?:thyroid|kidney|renal|liver|lung|bowel|bladder|sexual|cardiac|heart|motor) )function',
    'sick leave|sick note|signed off|off sick|off work|full[- ]time|part[- ]time|absence|days off|disability|on benefits|allowance|' +
      '(?:been|was|is|being)\\s+off(?!\\s+(?:his|her|their|the)\\s+(?:med|meds|medication|tablets|pills|drugs|alcohol|drink))(?![a-z])|' +
      'retired|pension|social|leisure|hobb|shopping|drive|driving|exercis|friends|family|children|at home|housebound|house-bound|' +
      'bedbound|in bed|out of bed|indoors|unable to|cannot manage|can[’\']?t manage|not coping|take care of|taking care of|look after|' +
      'looking after|care for|caring for|self-care|hygiene|housework|chores|independent in|withdrawn|isolat|avoids|avoided|avoiding|' +
      'avoidance|avoidant|lives alone|living alone|few contacts|no contacts|seeing friends|sees no one|sees nobody|' +
      '(?:leave|leaves|leaving|left) (?:the |her |his |their )?(?:house|home|flat|apartment|room)|go(?:es)? out|going out|get(?:s|ting)? out|' +
      'sleeps?\\s+(?:\\w+\\s+){0,2}?(?:all\\s+day|most\\s+of\\s+the\\s+day|through\\s+the\\s+day|until\\s+(?:noon|midday|the\\s+afternoon))|' +
      'not\\s+eating|barely\\s+eating|eating\\s+(?:poorly|little|irregularly)|football|handball|homework|coursework|assignments?',
    word('cope|copes|coped|coping|kids|study|studies|studying|exams?|adls?|shop|shops|bills|office|cook|cooking|laundry'),
    '(?:in|to|around) (?:the |her |his |their |my )?(?:house|room|flat)|(?:open|opens|opened|opening) (?:the |her |his |their )?(?:post|mail)|' +
      'anything done|things done|nothing done|contact with',
    start('daily (?:activit|life|living|task|routine)|activities of daily'),
  ),
  // A duration, not an age: «i to år», «de siste årene», «for tre dager siden», but not «Kvinne, 34 år»,
  // «34 år gammel», «gode og dårlige dager», «siden hun» (because) or «på den andre siden» (R3F-05, r4F-02).
  varighet: anyOf(
    // «Barnet er 3 måneder», «neste uke», «ukentlig», «lenge siden», «en tøff periode» are not how long the symptoms have lasted.
    '(?:store\\s+deler|det\\s+meste|mesteparten)\\s+av\\s+(?:\\p{L}+\\s+)?(?:voksen)?livet|(?<!er \\d+ |er \\p{L}+ )måned|varighet|varig|vedvar|kronisk|debut|har vart|halvår|lenge(?! siden)|lang tid|' +
      '(?:holdt|holder|pågått|pågår)\\s+på\\s+siden(?!\\p{L})|fra\\s+(?:tenårene|ungdomstiden|ungdommen|ungdomsårene|barndommen|barneårene|studietiden)|' +
      '(?:fra|siden) i fjor|i fjor (?:høst|vår|sommer|vinter)|fjoråret|livslang|hele livet|gjennom (?:hele )?(?:vinteren|våren|sommeren|høsten|året)|' +
      'hele (?:vinteren|våren|sommeren|høsten|året|voksenlivet|skoleåret)|(?:vinter|vår|sommer|høst|år)(?:en|et)?\\s+på\\s+rad|etter (?:jul|julen|påske|påsken|nyttår|sommeren|ferien|sommerferien)(?!\\p{L})|' +
      '(?:begynte|startet|debuterte|oppsto|oppstod|kom)\\s+(?:\\p{L}+\\s+){0,3}?(?:i|fra)\\s+(?:\\d0-?årene|tenårene|ungdomsårene|tjueårene|trettiårene|førtiårene|femtiårene)(?!\\p{L})',
    `${word('på')}\\s+(?:mer enn|over|minst|nesten|snart|godt over)\\s+(?:(?:${NB_QTY})\\s+)?(?:år|måneder|uker|dager)(?!\\p{L})`,
    `(?<!neste |kommende |om (?:en|ei|to|tre|fire|fem|seks|\\d+) )(?<!(?:gang|ganger|dag|dager|kveld|kvelder|natt|netter|time|timer)\\s+(?:i|per|pr\\.?|om)\\s+)${start('uke|uka')}(?!ntlig)`,
    word('mnd|mndr|md|årevis'),
    start('påske'),
    'siden (?:hun|han|de|pasienten) var',
    `${word('i|over|gjennom|for|etter|siste|de siste|det siste')}\\s+(?:(?:ca\\.?|omtrent|nesten|snart|over|under|mer enn|mindre enn|minst|godt over|vel|drøye|drøyt|bortimot)\\s+)?` +
      `(?:(?:${NB_QTY})\\s+)?(?:\\p{L}+\\s+)?(?:år|året|årene|års|dager|dagene|døgn|døgnene)(?!\\p{L})(?! gammel)`,
    `${word('flere|noen|mange|et par')}\\s+(?:år|dager|døgn)(?!\\p{L})`,
    `${word('i|siden|sia|sidn|fra|etter|før|rundt|til|av')}\\s+(?:\\p{L}+\\s+)?${word(NB_MONTHS)}`,
    '(?<!andre |ene |på |lenge )siden(?!\\s+(?:hun|han|de|dere|vi|jeg|du|pasienten|det er)(?!\\p{L}))',
    word('i (?:høst|sommer|vinter)|jul|julen') + '|' + word('i vår') + '(?![ \\t]+\\p{L})',
    // English.
    'month(?!s? old)|mths?(?!\\p{L})|duration|chronic|long-standing|longstanding|persistent|ongoing|onset|long time|long history|for ages|' +
      'lifelong|life-long|(?:all|most|much) (?:of )?(?:her|his|their) (?:adult )?life|throughout (?:her |his |their )?(?:adult )?life|(?:over|through|throughout|during) the (?:winter|spring|summer|autumn|fall|year)|' +
      'since (?:she|he|they) was|(?<!next |in (?:a|one|two|three|\\d+) )weeks?(?!end|ly)',
    `(?<![a-z])(?:for|over|in|during|since)\\s+(?:the\\s+)?(?:(?:past|last|about|around|almost|nearly|over|more than|at least|well over)\\s+)?` +
      `(?:(?:${EN_QTY})\\s+)?(?:[a-z]+\\s+)?(?:years?|days)(?![a-z])(?![- ]old)`,
    'years? ago|days ago|all (?:autumn|fall|spring|summer|winter|year)|(?:after|since) (?:christmas|easter|new year|the summer|the holidays)|' +
      'as long as (?:she|he|they|i) can remember|from (?:her|his|their) (?:teens|teenage years|childhood|adolescence|twenties)|(?:winter|spring|summer|autumn|year)s?\\s+in\\s+a\\s+row|' +
      '(?:since|started|began|begun|starting|came\\s+on|come\\s+on|developed|appeared)\\s+(?:[\\w-]+\\s+){0,6}?(?:last|this)\\s+(?:autumn|fall|spring|summer|winter|year)|' +
      '(?:the\\s+)?whole\\s+(?:\\w+\\s+)?(?:year|winter|spring|summer|autumn|term)',
    `(?<![a-z])of\\s+(?:more than|over|at least|nearly|almost)\\s+(?:(?:${EN_QTY})\\s+)?(?:years?|months?|weeks?)(?![a-z])`,
    `(?<![a-z])(?:going|gone)\\s+on\\s+(?:for\\s+)?(?:(?:about|around|over|nearly|almost|more\\s+than|at\\s+least)\\s+)?(?:(?:${EN_QTY})\\s+){0,2}(?:years?|months?|weeks?|days)(?![a-z])`,
    '(?<![a-z])(?:began|begun|started|starting|came\\s+on|first\\s+(?:appeared|started|began))\\s+(?:\\w+\\s+){0,3}?(?:in|during|from)\\s+(?:her|his|their|the|early|late|mid)\\s+(?:\\w+\\s+)?(?:teens|twenties|thirties|forties|fifties|20s|30s|40s|50s|childhood|adolescence)(?![a-z])',
    `(?<![a-z])(?:in|since|from|until|early|late|mid-?|around)\\s+(?:${EN_MONTHS})(?![a-z])`,
    'since(?!\\s+(?:she|he|they|we|i|you|the patient|it is)(?![a-z]))',
  ),
  behandling: anyOf(
    'rask psykisk|behandl|terapi|psykodynam|sertralin|escitalopram|fluoksetin|venlafaksin|mirtazapin|samtale|legemid|medisin|medikament|psykolog|' +
      'psykiater|antidepress|ssri|snri|kognitiv|mentaliseringsbasert|poliklini|innlagt|innleggelse|kommunal|oppfølging|' +
      'psykiatrisk sykepleier|helsesykepleier|tablett',
    word('kat|mg|bup|dps|vpp|ara|tsb|ect|emdr|camhs|cmht|iapt|ssri|snri'),
    'psykisk helsevern|spesialisthelsetjeneste|helsesykepleier|selvhjelp|frisklivs|mestringskurs|kid-kurs|' +
      'litium|quetiapin|olanzapin|aripiprazol|lamotrigin|valpro|diazepam|oxazepam|sobril|vival|zopiklon|imovane|cipralex|zoloft|fontex|remeron|efexor|' +
      'bupropion|wellbutrin|vortioksetin|brintellix|duloksetin|cymbalta|paroksetin|seroxat|citalopram|agomelatin|metylfenidat|ritalin|concerta|' +
      'lisdeksamfetamin|elvanse|atomoksetin|strattera|klozapin|leponex|risperidon|risperdal|haloperidol|lurasidon|trazodon|pregabalin|lyrica|antipsyk|stemningsstabil|sovemedisin',
    'treat|therap|psychodynam|sertraline|fluoxetine|venlafaxine|mirtazapine|medication|medicine|counselling|counseling|psycholog|psychiatr|' +
      'outpatient|admitted|admission|inpatient|municipal|follow-up|tablet|school nurse|student health|counsellor|counselor|self-help|healthy life|' +
      'mental health service|lithium|quetiapine|olanzapine|aripiprazole|lamotrigine|valproate|diazepam|oxazepam|zopiclone|citalopram|paroxetine|duloxetine|' +
      'vortioxetine|bupropion|methylphenidate|lisdexamfetamine|atomoxetine|clozapine|risperidone|haloperidol|lurasidone|trazodone|pregabalin|antipsychotic|mood stabili',
    word('cbt|dbt'),
  ),
  risiko: anyOf(
    // Suicide, death wishes and self-harm, Norwegian.
    'selvmord|suicid|selvskad|selvpåført|overdos|livstrett|livslede|livslyst|dødsønsk|dødstank|tanker om død|avslutte livet|' +
      'slutt på (?:livet|det hele)|(?:ikke|aldri) (?:mer )?(?:å )?våkne(?![rt])|verdt å leve|(?:lyst|ønske|ønsker|vil|orker)(?: ikke)? (?:til |om )?(?:å )?leve|' +
      'henge seg|hengte seg|hengt seg|kutte(?:r|t)? seg|kutting|rispe(?:r|t)? seg|risper seg|risping|skåret seg|skjærer seg|' +
      'skjære seg|brenne(?:r)? seg|brente seg|brent seg|' +
      'skade(?:r|t)? seg(?! i (?:kneet|foten|ryggen|beinet|benet|hånden|armen|skulderen|hodet|nakken))|' +
      'kriseplan|sikkerhetsplan|beskyttende faktor|(?<!økonomisk |finansiell )risiko(?! for at)|' +
      'bedre uten (?:meg|henne|ham|han|seg)|avskjedsbrev|samle(?:r|t)? på \\p{L}*(?:tablett|pille|medisin|medikament)|å forsvinne|' +
      '(?:ikke vil|vil ikke|ikke ønsker å|ønsker ikke å|orker ikke å) være her|(?:vil|ønsker) ikke (?:å )?våkne|ikke vil våkne|' +
      'gjøre noe med seg selv|gjøre seg noe|gjøre (?:det|seg) slutt|gjøre slutt på|å avslutte(?!\\s+(?:behandling|samtale|terapi|kur|studie|jobb))|' +
      '(?:å ikke|ikke å) leve|planlagt hvordan|konkrete? (?:planer|metode)|hoppe(?:t)? (?:fra|foran|ut|ned)|å hoppe|fjellvegg|' +
      'kjøre (?:av veien|i (?:fjell)?veggen)|legemsbeskad|legemsfornærm|knust|slått i veggen|slår i veggen|' +
      '(?:tidligere|ingen|flere|ett|et|to|tre)\\s+(?:selvmords)?forsøk(?!\\s+på\\s+å\\s+(?:slutte|kutte|redusere|trappe))|' +
      '(?:dyttet|dytter|slo|slår|sparket|sparker|kvalte|kveler|lugget|ristet)\\s+(?:til\\s+)?(?:sønnen|datteren|barnet|barna|kona|konen|mannen|samboeren|kjæresten|partneren|henne|ham|han|noen|en|ei|broren|søsteren|faren|moren)(?!\\p{L})|' +
      '(?:gjort|gjør|gjorde)\\s+opp\\s+(?:\\p{L}+\\s+)?gjeld|(?:sagt|sier|sa)\\s+opp\\s+(?:\\p{L}+\\s+)?abonnement\\p{L}*|ordnet\\s+opp\\s+i|passe\\s+(?:\\p{L}+\\s+)?(?:hunden|katten|dyrene)|' +
      'tenkt\\s+(?:ut|gjennom)\\s+(?:både\\s+)?(?:hvordan|når|hvor)(?!\\p{L})|(?:skrevet|skrev|skriver)\\s+ned\\s+(?:både\\s+)?(?:hvordan|når|hvor)(?!\\p{L})|' +
      'mening(?:en)?\\s+med\\s+livet|livet\\s+(?:har|hadde)\\s+(?:noen\\s+|ingen\\s+)?mening|' +
      'trang til å (?:skade|kutte|rispe|dø|ta|hoppe|forsvinne)',
    start('intox|intoks|sm-'),
    // «ta sitt eget liv», «ta livet sitt», «ta livet av seg», but not «ta livet med ro».
    word('(?:ta|tar|tok|tatt) (?:sitt |sitt eget |eget )liv|død|døden|ingen planer|planer om|ingen intensjon'),
    start('(?:ta|tar|tok|tatt) livet (?:sitt|av seg)'),
    // «dø», but not «frykt for å dø» in a panic attack (r4F-02).
    `(?<!frykt for å |redd for å |angst for å |redsel for å )${word('dø')}`,
    'våpen|tilgang til (?:medisiner|tabletter|piller)',
    // Violence and danger. «vold» not in «voldsomt»; «farlig» not in «ufarlig» (r4F-02).
    `${start('vold')}(?!som)`,
    '(?<!u)farlig|aggres|utager|truende|trussel|trusler|truet|truer med|skade (?:andre|noen)|(?:har|hadde) slått (?!opp|seg)',
    `${word('fare')}(?! for at)`,
    // English. «risk» at the start of a word, so not in «brisk».
    '(?<![a-z])(?:risk(?! of losing)|suicid|overdos|self[- ]?harm|self[- ]?injur)',
    '(?:end|ends|ending|ended|take|takes|taking|took) (?:his|her|their|my) (?:own )?life|end(?:ing)? it all|' +
      'kill(?:ing|ed)? (?:him|her|them|my)sel|' +
      '(?:harm|harms|harmed|harming|hurt|hurts|hurting|cut|cuts|cutting|burn|burns|burned|burnt|burning) (?:him|her|them|my)sel|' +
      'worth living|tired of life|weary of life|death wish|wish(?:es)? to die|wants? to die|better off dead|(?:were|was|be) dead|' +
      '(?<!fear |afraid |scared )(?:of|about) (?:death|dying)|harm(?:ing)? others|hurt(?:ing)? others|violen|aggress|threat|danger|' +
      '(?<![a-z])(?:previous|prior|past|no|any|several|multiple|two|three|one)\\s+(?:suicide\\s+)?attempts?(?![a-z])|attempted\\s+(?:suicide|to\\s+(?:kill|end|hang|overdose))|' +
      '(?:pushed|shoved|hit|hits|struck|slapped|kicked|strangled|choked|headbutted)\\s+(?:his|her|their|a|the|him|them|someone)(?![a-z])|' +
      '(?:paying|paid|pays)\\s+off|cancell?(?:ing|ed)?\\s+(?:\\w+\\s+)?subscriptions?|(?:put|putting|got|getting)\\s+(?:his|her|their)\\s+affairs\\s+in\\s+order|(?:mind|look\\s+after|take|have)\\s+(?:his|her|their)\\s+(?:dog|cat|pets?)|' +
      '(?:thought|worked|planned|figured)\\s+(?:out\\s+|through\\s+)?(?:both\\s+)?(?:how|when|where)\\s+(?:and\\s+(?:how|when|where)|(?:she|he|they)\\s+(?:would|will))|' +
      'weapon|firearm|safety plan|crisis plan|protective factor|(?:no|any) (?:intent|plans?)(?![a-z])|intent or plan|' +
      'better off without|goodbye (?:letter|note|message)|suicide note|stockpil|to disappear|' +
      '(?:not|n[’\']?t) (?:want|wish) to (?:be here|wake up)|not to wake up|never wake up|go on living|carry on living|keep living|' +
      'planned how|jump(?:ing)? (?:off|from|in front)|(?:about|of) jumping|rock face|driv(?:e|ing) into|punch|smash|assault|' +
      'urges? to (?:cut|harm|hurt|self-harm|die|kill|end|overdose|jump)|' +
      '(?:written|wrote|writes|writing)\\s+(?:down\\s+)?(?:how|when|where)\\s+(?:she|he|they|to)(?![a-z])|' +
      '(?<![a-z])(?:an|the)\\s+(?:suicide\\s+)?attempt(?![a-z])(?!\\s+(?:to|at)\\s+(?!(?:kill|end|hang|overdose|take\\s+(?:his|her|their)\\s+(?:own\\s+)?life)))|' +
      '(?:life|living)\\s+(?:has|had)\\s+(?:any|no)\\s+(?:meaning|point|purpose)|no\\s+point\\s+(?:in\\s+)?(?:living|going\\s+on|carrying\\s+on|life)',
    word('cutting|guns?'),
  ),
};

/** Clinical abbreviations, read case-sensitively, so a Norwegian «si» or «hi» never counts: SI and HI (suicidal and homicidal ideation), DSH. */
const ABBREVIATIONS: Partial<Record<CriterionId, RegExp>> = {
  risiko: /(?<![\p{L}])(?:SI|HI|DSH)(?![\p{L}])/u,
};

export const CRITERIA_ORDER: CriterionId[] = ['alvorlighet', 'funksjon', 'varighet', 'behandling', 'risiko'];

/** What the margin beside each referral section looks for (the brief: «omtalt / ikke omtalt ennå» per section). */
export const SECTION_CRITERIA: Record<SectionId, CriterionId[]> = {
  aktuelt: ['alvorlighet', 'varighet'],
  tidligere: ['behandling'],
  funksjon: ['funksjon'],
  risiko: ['risiko'],
  sporsmal: [],
};

/**
 * Clauses: sentences, lines, semicolons, commas, and the words that join what was not asked to what was found
 * («men», «but», «though»). A bare topic before a comma («Suicidalitet, ikke vurdert.») waits for what is said about it.
 */
const CLAUSES =
  /(?<=[.!?])(?<!(?:^|[\s(])(?:jf|jfr|ca|pga|evt|ev|ift|iht|mht|mtp|dvs|ang|tlf|avd|pr|ref|cf|vs|dr|nr|kl|mg|ml|stk|osv|mfl|vurd|pt|pas|f\.eks|bl\.a|e\.g|i\.e|etc|approx|incl|esp|appt)\.)\s+|\n+|\s*;\s*|,\s+|\s+(?:men|but|though|although|selv om|likevel)\s+/iu;
const LEADING = /^(?:og|men|så|samt|and|but|so|though|although|however|likevel)\s+/iu;
const TOPIC_ONLY =
  /^(?:aktuell\s+|current\s+)?(?:suicidalitet|suicidal\s+risiko|selvmordsrisiko|selvmordsfare|voldsrisiko|risiko|risikovurdering|selvskading|funksjon|funksjonsnivå(?:et)?|funksjonsfall|tidligere\s+behandling|behandling|suicidality|suicide\s+risk|risk|risk\s+assessment|violence\s+risk|self-harm|function(?:ing)?|level\s+of\s+function(?:ing)?|previous\s+treatment|treatment)[\s.:]*$/iu;

function clauses(text: string): string[] {
  const out: string[] = [];
  let carry = '';
  for (const raw of text.split(CLAUSES)) {
    const part = (raw ?? '').trim().replace(LEADING, '');
    if (!part) continue;
    const cur = carry ? `${carry} ${part}` : part;
    if (TOPIC_ONLY.test(cur)) {
      carry = cur.replace(/[\s.:]+$/u, '');
      continue;
    }
    out.push(cur);
    carry = '';
  }
  if (carry) out.push(carry);
  return out;
}

/** «Suicidalitet:», «Risk:»: a leading label, so the value after it can be judged on its own. */
const LABEL = /^\s*\p{L}[\p{L}\d\s/().-]{0,40}?\s*:\s*/u;

/** A value that holds nothing or says only that nothing is there yet: «-», «?», «Fylles ut.», «Ukjent.», «TBC», «Not done.» */
const PLACEHOLDER = new RegExp(
  '^(?:' +
    [
      '[\\s\\-\\u2013\\u2014?.\\u2026/*x]*',
      '\\[[^\\]]*\\]',
      '<[^>]*>',
      '\\{[^}]*\\}',
      'n\\/?[ak]',
      'tb[cda]',
      'ingen (?:opplysninger|info(?:rmasjon)?|kommentar\\p{L}*)',
      'no (?:info(?:rmation)?|comments?)',
      'not applicable',
      '(?:skal\\s+)?(?:fylles|utfylles|fyll)(?:\\s+(?:ut|inn))?(?:\\s+senere)?',
      'ettersendes',
      'skrives(?:\\s+inn)?(?:\\s+senere)?',
      'legges\\s+(?:inn|til|ved)(?:\\s+senere)?',
      'oppdateres(?:\\s+senere)?',
      'innhentes',
      'etterspørres',
      'etterspurt',
      'bestilt',
      'kommer(?:\\s+senere)?',
      'sendes\\s+(?:senere|separat|som\\s+tillegg\\p{L}*.*)',
      'følger(?:\\s+senere)?',
      'to be (?:completed|added|confirmed|determined|sent|done|obtained|requested|updated|provided|assessed|clarified|explored|filled\\s+(?:in|out))',
      '(?:details\\s+)?to (?:follow|come)',
      'will follow',
      'requested',
      'ikk(?:e|je)\\s+(?:gjort|utført|gjennomført|gjennomgått|foretatt|vurdert|kartlagt|rukket|kjent|etterspurt|spurt|undersøkt)',
      'gjenstår',
      'mangler',
      'avventer',
      'ukjent',
      'uavklart',
      'uklart?',
      'uvisst?',
      'usikkert?',
      'vet\\s+ikk(?:e|je)?',
      'not (?:yet )?(?:done|assessed|known)',
      'pending',
      'outstanding',
      'awaited',
      'missing',
      'unknown',
      'unclear',
      'uncertain',
      "(?:i\\s+)?don['’]?t know",
      'not sure',
      'skriv(?:\\s+(?:inn|her|tekst|noe))?(?:\\s+(?:her|tekst))?',
      'todo|to\\s*do|fixme|fill\\s+(?:in|out)(?:\\s+(?:here|later))?',
      '(?:enter|type|write|add)\\s+(?:text|details|information|here)(?:\\s+here)?',
      '(?:ennå\\s+|enda\\s+)?ikke\\s+(?:mottatt|kommet|ankommet)(?:\\s+(?:ennå|enda))?',
      'not\\s+(?:yet\\s+)?(?:received|arrived|available|back)(?:\\s+yet)?',
      'needs?\\s+(?:clarifying|clarification|checking|confirming|confirmation|exploring)',
    ].join('|') +
    ')[\\s.!]*$',
  'iu',
);

/** A question states nothing: «Om hun har gått til psykolog tidligere, vet jeg ikke.», «Whether he's seen anyone before, I couldn't say.», «Previous therapy?» */
const QUESTION = /^(?:whether|if)\s|^(?:om|hvorvidt)\s+(?:hun|han|pasienten|pas\.?|de|det|dette|vi|noen)\s|\?\s*$/iu;
/** «Spurte om hun har tanker om å ta sitt eget liv», «Asked about self-harm»: the question the GP asked, not the answer. */
const ASKED = /^(?:(?:jeg|vi|i|we)\s+)?(?:spurte|spør|asked|ask)(?!\s+(?:(?:jeg|vi)\s+)?(?:ikke|ikkje|aldri|not|never)(?!\p{L}))\s+(?:\p{L}+\s+){0,2}?(?:om|whether|if|about)\s/iu;

/** A clause that only points elsewhere: «Se epikrise.», «Viser til tidligere henvisning.», «Beskrevet i sykehistorien over.», «See attached.» */
const REFERENCE =
  /^(?:se(?!\s+(?:ingen|ikke)(?!\p{L}))\s+\S|jfr?\.?\s|ref\.?\s|viser\s+til|henviser\s+til|som\s+(?:over|nevnt|ovenfor|beskrevet|tidligere)|(?:beskrevet|omtalt|nevnt|redegjort\s+for)\s+(?:i|under)\s|(?:please\s+)?see\s|cf\.?\s|(?:please\s+)?refer(?:s|red)?\s+to|as\s+(?:above|below|per|previously|described|mentioned)|(?:covered|described|mentioned|detailed|outlined|documented)\s+(?:in|under|above|below)(?![a-z])|står\s+(?:under|beskrevet|nevnt|omtalt)\s|fremgår\s+(?:av|under|i)\s|(?:details?|info(?:rmation)?|more)\s+(?:are\s+|is\s+)?(?:in|on)\s+(?:the\s+|my\s+)?(?:attached|enclosed|previous|earlier|letter|referral|notes?)|(?:in|on)\s+(?:the\s+)?(?:attached|enclosed)|(?:attached|enclosed|vedlagt|vedlegg|se\s+vedlegg)[\s.]*$|(?:as\s+)?per\s+(?:my\s+|the\s+)?(?:previous|earlier|last)\s+(?:letter|referral|note)|i\s+(?:vedlagt|vedlagte)\s|står\s+i\s+(?:\p{L}+\s+)?(?:journal\p{L}*|epikris\p{L}*|notat\p{L}*|vedlegg\p{L}*|henvisning\p{L}*|brev\p{L}*)(?=[\s.!]*$)|(?:it['’]?s|it\s+is|this\s+is|that\s+is|all|everything\s+is)\s+(?:all\s+)?(?:in|on)\s+(?:the|my|her|his|their)\s+(?:notes|records?|letter|journal|file|chart|attachments?)(?=[\s.!]*$))/iu;

/*
 * A clause that says the criterion was not assessed, is unknown, or is left to DPS or to later (r5F-02, r6F-01,
 * r7F-01). It is read by structure, not by phrase: a negation or a deferral that governs an act of assessing,
 * asking or talking («ikke vurdert», «glemte å spørre», «rakk ikke å gå inn på», «ingen risikovurdering foreligger»,
 * «bør vurderes av DPS», «I didn't get round to», «no formal risk assessment», «will revisit»), the GP's own
 * uncertainty at the start of a clause («Vet ikke om …», «Usikker på …»; not «Hun vet ikke …», a patient's words),
 * or the patient declining to talk. «Ikke vurdert som suicidal» and «må vurderes som høy» are assessments.
 */
const NB_FILL =
  '(?:blitt|blir|ble|fått|fikk|hatt|har|hadde|kunnet|klart|rukket|rakk|tid|anledning|mulighet|til|å|noen|noe|nok|ennå|enda|nærmere|direkte|formelt|systematisk|strukturert|grundig|grundigere|skikkelig|helt|egentlig|ordentlig|spesifikt|eksplisitt|' +
  'dessverre|desverre|heller|faktisk|særlig|nøye|godt|tilstrekkelig|detalj|detaljer|dybden|mulig|aktuelt|relevant|nødvendig|hensiktsmessig|praktisk|forsvarlig|jeg|vi|selv|dette|det|denne|gangen|i|dag)';
const NB_ASSESS =
  'vurd\\p{L}*\\.?(?!\\p{L})(?!\\s+(?:som|til|å|at)(?!\\p{L}))|kartl\\p{L}*|spør\\p{L}*(?!\\p{L})(?!\\s+(?:om|etter)\\s+hjelp)|spurt\\p{L}*(?!\\p{L})(?!\\s+(?:om|etter)\\s+hjelp)|etterspør\\p{L}*|etterspurt\\p{L}*|undersøk\\p{L}*|avklar\\p{L}*|utred\\p{L}*|screen\\p{L}*|diskut\\p{L}*|berør\\p{L}*|' +
  '(?:snakk|prat)\\p{L}*\\s+(?:med\\s+(?:henne|ham|han|pasienten|pas\\.?|dem)(?:\\s+(?:\\p{L}+\\s+)?om|\\s+(?:alene|direkte|ennå|enda|ordentlig)(?!\\p{L})|(?=\\s*[.,;:]|\\s*$))|om)|(?:tatt|ta|tok|tas|tar)\\s+(?:(?:det|dette|den|temaet|tema|dem)\\s+)?opp(?!\\s+igjen)|' +
  '(?:gått|gå|gikk|går|komme|kommet|kom)\\s+inn\\s+på|(?:tatt|ta|tok|tar)\\s+stilling|(?:sjekk\\p{L}*|(?:gått|gå|gikk|går)\\s+(?:i)?gjennom|innhent\\p{L}*|lest|lese|leste)\\s+(?:\\p{L}+\\s+)?(?:journal\\p{L}*|epikrise\\p{L}*|notat\\p{L}*|opplysning\\p{L}*|papir\\p{L}*|dokument\\p{L}*)|' +
  'innhent\\p{L}*|verifiser\\p{L}*|(?:gjort|gjøre|gjorde|utført|utføre|gjennomført|foretatt|tatt)\\s+(?:\\p{L}+\\s+){0,2}\\p{L}*(?:vurdering|kartlegging|screening|undersøkelse|utredning)|' +
  'hent\\p{L}*\\s+inn\\s+(?:\\p{L}+\\s+)?(?:opplysning\\p{L}*|informasjon|info|journal\\p{L}*|epikris\\p{L}*|notat\\p{L}*|papir\\p{L}*|dokument\\p{L}*)';
const EN_FILL =
  "(?:yet|been|be|get|got|gotten|had|have|has|a|an|the|any|chance|opportunity|time|round|around|to|able|managed|properly|formally|fully|directly|really|further|explicitly|specifically|formal|full|proper|" +
  "unfortunately|sadly|honestly|actually|in|detail|much|depth|something|anything|risk|suicide|suicidal|self-harm|violence|i|we|i['’]ve|we['’]ve|i['’]d|we['’]d|her|him|them|today|" +
  "done|completed|carried|out|undertaken|performed|made|structured|thorough|detailed|comprehensive|systematic|relevant|applicable|necessary|possible|appropriate)";
const EN_ASSESS =
  'assess\\w*|asess\\w*|adress\\w*|evaluat\\w*|screen\\w*|ask(?:ed|ing)?(?![a-z])(?!\\s+for\\s+help)|enquir\\w*|inquir\\w*|explor\\w*|discuss\\w*|(?:talk|speak|spoke|spoken)\\w*\\s+(?:(?:to|with)\\s+(?:her|him|them|the\\s+patient)(?:\\s+(?:\\w+\\s+)?about|\\s+(?:alone|directly|yet|properly)(?![a-z])|(?=\\s*[.,;:]|\\s*$))|about)|' +
  'go(?:ne)?\\s+into|went\\s+into|cover\\w*|address\\w*|map(?:ped|ping)?|touch\\w*\\s+(?:on|upon)|look\\w*\\s+(?:at|into)|examin\\w*|review\\w*|clarif\\w*|verif\\w*|broach\\w*|establish\\w*|ascertain\\w*|' +
  '(?:get|got|gotten|getting)\\s+(?:on\\s*to|onto|through)(?![a-z])|rais(?:e|ed|ing)(?=\\s*[.,;:!]|\\s*$|\\s+(?:today|yet|at\\s+all|either|with\\s+(?:her|him|them|the\\s+patient|the\\s+pt|pt)))|' +
  '(?:get|got|gotten|getting)\\s+(?:round\\s+|around\\s+)?to\\s+(?:this|it|that|them)(?![a-z])|get\\s+(?:round|around)\\s+to|go(?:ne)?\\s+through|went\\s+through|' +
  'rais(?:e|ed|ing)\\s+(?:it|this|that|the\\s+(?:topic|subject|issue|question))(?![a-z])|(?:bring|bringing|brought)\\s+(?:(?:it|this|that|the\\s+(?:topic|subject|issue|question))\\s+)?up(?![a-z])|' +
  '(?:check|obtain|request|get|got)\\w*\\s+(?:the\\s+|her\\s+|his\\s+|their\\s+)?(?:old\\s+|previous\\s+)?(?:records?|notes|history|journal)|ax(?![a-z])|' +
  '(?:gather|collect)\\w*\\s+(?:any\\s+|the\\s+|more\\s+|further\\s+)?(?:information|info|details|records?|notes|history)';
const NOT_STATED = anyOf(
  // Norwegian: a negation that governs an act of assessing, asking or talking.
  `(?<!\\p{L})(?:ikke|ikkje|aldri|uten|glemte|glemt|glemmer)\\s+(?:${NB_FILL}\\s+){0,4}(?:${NB_ASSESS})`,
  '(?<!\\p{L})(?:spurte|vurderte|kartla|undersøkte|avklarte|diskuterte|screenet)\\s+(?:jeg\\s+|vi\\s+)?ikke(?!\\p{L})',
  '(?<!\\p{L})(?:tok|tar|gikk|kom)\\s+(?:(?:jeg|vi|det|dette|temaet|den)\\s+){0,2}ikke\\s+(?:(?:det|dette|temaet|den)\\s+)?(?:opp|inn\\s+på)(?!\\p{L})|(?<!\\p{L})(?:snakket|pratet)\\s+(?:jeg\\s+|vi\\s+)?ikke\\s+(?:med\\s+(?:henne|ham|pasienten)\\s+)?om(?!\\p{L})',
  // Norwegian: no time, in the GP's voice («Det ble ikke tid», «jeg har ikke hatt anledning»), not the patient's («Hun har ikke tid til venner»).
  '(?<!\\p{L})(?:tidsnød|rakk\\s+ikke|ikke\\s+rukket|tiden\\s+(?:strakk|rakk)\\s+ikke)(?!\\p{L})|(?<!\\p{L})(?:ble|var)\\s+(?:det\\s+)?(?:ikke|ingen)\\s+(?:\\p{L}+\\s+)?(?:tid|anledning|rom)(?!\\p{L})',
  '(?<!\\p{L})(?:jeg|vi)\\s+(?:\\p{L}+\\s+){0,2}?(?:ikke|ingen)\\s+(?:(?:hatt|fått)\\s+)?(?:tid|anledning|mulighet)(?!\\p{L})|(?<!\\p{L})(?:fikk|hadde|har)\\s+(?:jeg|vi)\\s+(?:\\p{L}+\\s+)?(?:ikke|ingen)\\s+(?:(?:hatt|fått)\\s+)?(?:tid|anledning|mulighet)(?!\\p{L})',
  // Norwegian: the patient would not talk about it.
  '(?<!\\p{L})(?:ville|vil|ønsket|ønsker|orket|orker|turte|tør)\\s+ikke\\s+(?:å\\s+)?(?:snakke|prate|svare|fortelle|si|gå\\s+inn\\s+på|utdype|dele|åpne\\s+seg)(?!\\p{L})',
  '(?<!\\p{L})(?:nekt|avvis|vegr)\\p{L}*\\s+(?:seg\\s+)?(?:for\\s+)?(?:å\\s+)?(?:svare|snakke|prate|fortelle|si|gå\\s+inn\\s+på|utdype)(?!\\p{L})|(?<!\\p{L})(?:uvillig|motvillig)\\s+til\\s+(?:å\\s+)?(?:svare|snakke|prate|fortelle|si|gå\\s+inn\\s+på|utdype)(?!\\p{L})',
  '(?<!\\p{L})(?:skiftet|byttet|endret)\\s+(?:tema|samtaleemne)|(?<!\\p{L})ikke\\s+(?:kommet\\s+(?:så\\s+langt|dit|opp)|vært\\s+tema|tema)(?!\\p{L})|(?<!\\p{L})(?:ikke|ingen|mangler|manglende|uten)\\s+(?:(?:fått|hatt|har)\\s+)?(?:god\\s+|full\\s+|klar\\s+|noen\\s+)?oversikt',
  // Norwegian: the GP does not know, with the subject after the verb: «Dette vet jeg lite om.», «Det kan jeg ikke si.»
  '(?<!\\p{L})(?:vet|kjenner)\\s+(?:jeg|vi)\\s+(?:ikke|lite|for\\s+lite|ingenting)(?!\\p{L})|(?<!\\p{L})(?:kan|klarer)\\s+(?:jeg|vi)\\s+ikke\\s+(?:si|svare|vurdere|bedømme|uttale)(?!\\p{L})|(?<!\\p{L})(?:jeg|vi)\\s+(?:kan|klarer)\\s+ikke\\s+(?:si|svare|vurdere|bedømme|uttale)(?!\\p{L})',
  // Norwegian: no assessment, information or access, or an assessment that is missing, outstanding or not possible.
  '(?<!\\p{L})(?:ingen|uten|mangler|manglende)\\s+(?:(?:ny|nye|formell|formelle|systematisk|strukturert|aktuell|oppdatert|egen|fullstendig|grundig|full|noen)\\s+)?(?:\\p{L}*(?:vurdering|kartlegging|screening|utredning|undersøkelse)|opplysninger|informasjon|info)(?!\\p{L})',
  '(?<!\\p{L})(?:ikke|uten|mangler|ingen)\\s+(?:\\p{L}+\\s+)?tilgang\\s+til\\s+(?:\\p{L}+\\s+){0,2}?(?:journal\\p{L}*|epikris\\p{L}*|notat\\p{L}*|opplysning\\p{L}*|dokumentasjon\\p{L}*)',
  '(?<!\\p{L})(?:\\p{L}*(?:vurdering|kartlegging|screening|utredning|undersøkelse)|opplysninger|informasjon|journal\\p{L}*|epikrise\\p{L}*)(?:\\s+[\\p{L}.,]+){0,5}?\\s+(?:er\\s+|ble\\s+|har\\s+|var\\s+|blir\\s+)?' +
    '(?:ikke\\s+(?:(?:blitt|vært)\\s+)?(?:gjort|utført|gjennomført|foretatt|tatt|mulig|ferdig|klar|innhentet|mottatt|kommet|ankommet)|mangler|gjenstår|avventes|utsatt|utsettes|foreligger\\s+ikke|ikke\\s+foreligger|etterspurt|bestilt|innhentes|ukjent|uavklart|uklar)(?!\\p{L})',
  // Norwegian: left to DPS or to later.
  '(?<!\\p{L})(?:må|bør|skal|vil|planlegger\\s+å|tenker\\s+å|kommer\\s+til\\s+å)\\s+(?:\\p{L}+\\s+){0,3}?(?:vurdere|vurderes|kartlegge|kartlegges|spørre|spørres|undersøke|undersøkes|avklare|avklares|utrede|utredes|gå\\s+inn\\s+på|ta\\s+stilling|sjekke|sjekkes|innhente|innhentes|se\\s+nærmere\\s+på|(?:ta|tas)\\s+opp\\s+(?:dette|det|temaet|tema|risiko\\p{L}*|suicid\\p{L}*|selvmord\\p{L}*|funksjon\\p{L}*|behandling\\p{L}*))(?!\\s+(?:som|til)(?!\\p{L}))(?!\\p{L})',
  '(?<!\\p{L})(?:vurderes|kartlegges|tas\\s+opp|følges\\s+opp|undersøkes|avklares|ses\\s+på|gjøres|utredes|innhentes)\\s+(?:\\p{L}+\\s+){0,4}?(?:senere|seinere|neste|ved\\s+neste|på\\s+neste|hos\\s+dere|ved\\s+dps|av\\s+dps|av\\s+dere|ved\\s+inntak|ved\\s+første|i\\s+første|når)(?!\\p{L})',
  '(?<!\\p{L})(?:dere|dps)\\s+bes\\s+(?:\\p{L}+\\s+)?(?:vurdere|kartlegge|avklare|undersøke|se\\s+på|innhente)|(?<!\\p{L})bes\\s+(?:\\p{L}+\\s+)?(?:vurdert|kartlagt|avklart|undersøkt|innhentet)',
  '(?<!\\p{L})(?:ber|ønsker|anmoder)\\s+(?:om\\s+)?(?:at\\s+)?(?:dps|dere|deres|spesialisthelsetjenesten|spesialist\\p{L}*)\\s+(?:\\p{L}+\\s+){0,2}?(?:vurder\\p{L}*|kartlegg\\p{L}*|gjør\\p{L}*|ser\\s+på|se\\s+på|tar\\s+stilling|avklar\\p{L}*|undersøk\\p{L}*|innhent\\p{L}*|sjekk\\p{L}*|etterspør\\p{L}*|spør\\p{L}*|henter\\s+inn|hente\\s+inn|tar\\s+(?:\\p{L}+\\s+)?\\p{L}*vurdering\\p{L}*|tar\\s+over|se\\s+nærmere\\s+på|ser\\s+nærmere\\s+på)',
  '(?<!(?:hun|han|pasienten|pas\\.?|de)\\s+)(?<!\\p{L})(?:ønsker|ber\\s+om|trenger|behov\\s+for|anmoder\\s+om|takknemlig\\s+for|takk\\s+for)\\s+(?:\\p{L}+\\s+){0,2}?\\p{L}*(?:vurdering|kartlegging|utredning)(?!\\p{L})|(?<!\\p{L})henvises\\s+(?:\\p{L}+\\s+){0,3}?(?:for|til|med\\s+tanke\\s+på)\\s+(?:\\p{L}+\\s+){0,2}?\\p{L}*(?:vurdering|kartlegging|utredning)(?!\\p{L})',
  '(?<!\\p{L})overlat\\p{L}*\\s+(?:\\p{L}+\\s+){0,4}?til\\s+(?:dps|dere|spesialist\\p{L}*)|(?<!\\p{L})overlates(?:\\s+til)?\\s+(?:dps|dere)',
  '(?<!\\p{L})(?:dere|dps)\\s+(?:må|bør|kan|skal|får)\\s+(?:\\p{L}+\\s+){0,2}?(?:vurdere|kartlegge|innhente|avklare|undersøke|se\\s+på|se\\s+nærmere\\s+på|ta\\s+stilling|sjekke|spørre|avgjøre|bestemme|(?:gjøre|ta)\\s+(?:en\\s+|ny\\s+)?\\p{L}*vurdering\\p{L}*)|(?<!\\p{L})(?:må|bør|kan|skal|får)\\s+(?:dere|dps)\\s+(?:\\p{L}+\\s+){0,2}?(?:vurdere|kartlegge|innhente|avklare|undersøke|se\\s+på|se\\s+nærmere\\s+på|ta\\s+stilling|sjekke|spørre|avgjøre|bestemme|(?:gjøre|ta)\\s+(?:en\\s+|ny\\s+)?\\p{L}*vurdering\\p{L}*)',
  '(?<!\\p{L})(?:jeg|vi)\\s+kommer\\s+tilbake\\s+(?:til|med)(?!\\p{L})|(?<!\\p{L})kommer\\s+tilbake\\s+(?:til|med)\\s+(?:dette|det|temaet|mer|flere|nærmere|utfyllende|opplysninger|informasjon|info|en\\s+vurdering|vurdering)(?!\\p{L})|(?<!\\p{L})ettersend\\p{L}*',
  '(?<!\\p{L})(?:utsatt|utsettes)(?!\\s+for)(?!\\p{L})|(?<!\\p{L})(?:tar|tas)\\s+(?:\\p{L}+\\s+)?opp\\s+(?:igjen\\s+)?(?:når|senere|neste|etter)(?!\\p{L})|(?<!\\p{L})avventer\\s+(?:\\p{L}+\\s+)?(?:vurdering|kartlegging)',
  // English: a negation that governs an act of assessing, asking or talking.
  `(?:n['’]t|(?<![a-z])(?:not|never|without|forgot|forgotten|failed|didnt|dont|doesnt|havent|hasnt|hadnt|wasnt|werent|cant|couldnt|wouldnt|isnt|arent|wont|shouldnt))\\s+(?:${EN_FILL}\\s+){0,6}(?:${EN_ASSESS})`,
  "(?:n['’]t|(?<![a-z])not)\\s+(?:a|the)\\s+(?:topic|subject)(?![a-z])",
  // English: no time, in the GP's voice («so no time for a risk assessment»), not the patient's («She has no time for friends»).
  "(?<![a-z])(?:ran|run|running)\\s+out\\s+of\\s+time|(?<![a-z])(?:i|we)\\s+(?:\\w+\\s+){0,2}?(?:had|have|got)\\s+no\\s+time|(?<![a-z])(?:i|we)\\s+(?:did\\s+not|didn['’]t|do\\s+not|don['’]t)\\s+have\\s+(?:the\\s+|enough\\s+)?time|(?<![a-z])there\\s+(?:was|wasn['’]t|is|isn['’]t)\\s+(?:no\\s+|not\\s+)?(?:enough\\s+)?time",
  "(?<![a-z])not\\s+enough\\s+time\\s+(?:to|for)\\s+(?:\\w+\\s+){0,3}?(?:assess|ask|explor|discuss|go\\s+into|cover|this|it|that)",
  // English: the patient would not talk about it.
  "(?<![a-z])(?:would|will|did|does|do|won)\\s*(?:not|n['’]t)\\s+(?:want\\s+to\\s+)?(?:talk|speak|answer|say|discuss|go\\s+into|disclose|share|elaborate|open\\s+up)|(?<![a-z])(?:refus|declin)\\w*\\s+(?:to\\s+)?(?:talk|speak|answer|discuss|say|engage|go\\s+into|disclose|share|elaborate)|" +
    "(?<![a-z])prefer(?:red|s)?\\s+not\\s+to\\s+(?:talk|speak|answer|discuss|say|go\\s+into|disclose|share)|(?<![a-z])changed\\s+the\\s+subject|(?<![a-z])(?:reluctant|unwilling|not\\s+willing)\\s+to\\s+(?:talk|speak|answer|discuss|say|disclose|share|elaborate|engage|go\\s+into|open\\s+up)",
  "(?:n['’]t|(?<![a-z])not)\\s+(?:yet\\s+)?come\\s+up|(?<![a-z])(?:hasn['’]t|has\\s+not|haven['’]t|have\\s+not)\\s+(?:yet\\s+)?(?:got|gotten)\\s+(?:that\\s+far|to\\s+(?:it|this|that))",
  // English: no assessment, information or access, or one that is missing, requested, outstanding or not possible.
  '(?<![a-z])(?:no|without|missing|lacking)\\s+(?:(?:formal|full|proper|recent|current|documented|structured|risk|suicide|suicidal|self-harm|violence|further)\\s+){0,3}(?:assessment|evaluation|screening|ax|assmt|information|info|details|data)(?![a-z])',
  "(?:n['’]t|(?<![a-z])(?:not|no|without))\\s+(?:\\w+\\s+){0,2}?access\\s+to\\s+(?:\\w+\\s+){0,3}?(?:records?|notes|history|letters?|documentation|journal)",
  "(?<![a-z])(?:assessment|evaluation|screening|ax|information|info|details|records?|notes)(?:\\s+\\S+){0,4}?\\s+(?:(?:is|was|has|have|are|were)\\s+)?(?:(?:not|n['’]t)\\s+(?:yet\\s+)?(?:been\\s+)?(?:done|performed|completed|carried\\s+out|undertaken|made|obtained|possible|available)|pending|outstanding|awaited|missing|incomplete|to\\s+follow|unavailable|unknown|requested|ordered|sought|being\\s+(?:obtained|requested|sought)|(?:not\\s+(?:yet\\s+)?|n['’]t\\s+(?:yet\\s+)?)(?:arrived|received|come\\s+through)|(?:still\\s+)?in\\s+the\\s+post|on\\s+(?:their|its)\\s+way)(?![a-z])",
  "(?<![a-z])(?:unable|not\\s+able|impossible)\\s+to\\s+(?:assess|evaluate|explore|ask|screen|say|judge|tell|comment|answer|confirm|verify|determine|establish|clarify|obtain)|(?<![a-z])(?:don['’]?t|do\\s+not)\\s+have\\s+(?:a\\s+)?(?:clear\\s+|full\\s+)?(?:picture|overview|idea)",
  // English: left to DPS or to later.
  "(?<![a-z])(?:will|to\\s+be|should\\s+be|must\\s+be|needs?\\s+to\\s+be|need\\s+to|needs\\s+to|going\\s+to|plan(?:ning)?\\s+to|intend\\s+to|hope\\s+to|i['’]ll|we['’]ll)\\s+(?:\\w+\\s+){0,3}?(?:assess\\w*|evaluat\\w*|explor\\w*|screen\\w*|ask(?:ed)?(?!\\s+for)(?![a-z])|discuss\\w*|check\\w*|map\\w*|review\\w*|revisit\\w*|clarif\\w*|cover\\w*|go\\s+through|go\\s+into|address\\w*|follow\\w*\\s+up|pick\\s+(?:it|this|that)\\s+up|take\\s+(?:it|this|that)\\s+up|look\\s+(?:at|into)\\s+(?:this|it|that)|obtain\\w*|get\\s+(?:the\\s+)?(?:records?|notes|details)|verif\\w*|rais(?:e|ed|ing)(?![a-z])|brought\\s+up|bring\\s+(?:it|this|that)\\s+up|broach\\w*|take\\s+(?:it|this|that)\\s+(?:at|on|in|during|when|after|next)(?![a-z]))(?!\\s+as(?![a-z]))",
  "(?<![a-z])(?:i|we)\\s*(?:will|['’]ll|shall)\\s+(?:\\w+\\s+){0,2}?(?:forward\\w*|send\\w*|updat\\w*|add\\w*|complet\\w*|fill\\w*\\s+(?:in|out)|provid\\w*|suppl\\w*|let\\s+you\\s+know|get\\s+back|come\\s+back|revert)",
  "(?<![a-z])(?:needs?|requires?|awaiting|awaits|warrants?)\\s+(?:[a-z'’-]+\\s+){0,4}(?:assessment|evaluation|exploration|screening|ax)(?![a-z])",
  "(?<![a-z])please\\s+(?:\\w+\\s+)?(?:assess|evaluate|explore|consider|check|review|map|obtain|request|get|ask|clarify|confirm|verify|find\\s+out|look\\s+(?:\\w+\\s+){0,2}?(?:at|into))|(?<![a-z])(?:would|i['’]d|we['’]d)\\s+(?:appreciate|welcome|value|be\\s+grateful\\s+for)\\s+(?:your|an?|the)\\s+(?:\\w+\\s+)?(?:assessment|evaluation|opinion|view|input)",
  "(?<![a-z])grateful\\s+(?:if|for)\\s+(?:you\\s+(?:could|would|can)\\s+)?(?:\\w+\\s+){0,6}?(?:assess\\w*|evaluat\\w*|explor\\w*|check\\w*|review\\w*|look\\w*\\s+(?:at|into)|opinion|view|input)|(?<![a-z])(?:could|would|can)\\s+you\\s+(?:please\\s+)?(?:\\w+\\s+)?(?:assess|evaluate|explore|check|review|obtain|clarify|look\\s+(?:at|into))",
  "(?<![a-z])(?:i['’]d|i\\s+would|we\\s+would|we['’]d)\\s+(?:ask|like|want|prefer)\\s+(?:you|dps|your\\s+team|the\\s+team)\\s+to|(?<![a-z])defer(?:red)?\\s+to|(?<![a-z])leave\\s+(?:this|it|that)?\\s*(?:for|to)\\s+(?:dps|you|the\\s+team|the\\s+specialists?)|(?<![a-z])(?:left|leaving)\\s+(?:this\\s+|it\\s+|that\\s+)?(?:to|for)\\s+(?:dps|you|your\\s+team|the\\s+team|(?:the\\s+)?specialists?|(?:the\\s+)?specialist\\s+(?:services?|team|care)|secondary\\s+care|(?:the\\s+)?mental\\s+health\\s+services?)(?![a-z])",
  "(?<![a-z])ask(?:ing)?\\s+(?:that|if|whether)\\s+(?:dps|you|your\\s+team|the\\s+team|specialists?|specialist\\s+services?)(?![a-z])|(?<![a-z])(?:best|better|properly|ideally|more\\s+appropriately)\\s+(?:be\\s+)?(?:assessed|evaluated|explored|examined|reviewed|done|addressed|handled|clarified)\\s+(?:by|at|in|with)\\s+(?:dps|you|the\\s+team|your\\s+team|specialists?|specialist\\s+services?|secondary\\s+care)(?![a-z])",
  "(?<![a-z])(?:dps|you|your\\s+team|the\\s+team|specialists?|specialist\\s+services?)\\s+(?:can|could|may|might|will|would|must|should|need\\s+to|needs\\s+to|has\\s+to|have\\s+to|will\\s+have\\s+to|will\\s+need\\s+to)\\s+(?:\\w+\\s+){0,2}?(?:assess|evaluate|explore|check|review|map|clarify|decide|obtain|judge|determine|consider|look\\s+(?:at|into))(?![a-z])",
  "(?<![a-z])(?:should|must|needs?\\s+to|ought\\s+to|has\\s+to|have\\s+to|to)\\s+be\\s+(?:done|carried\\s+out|undertaken|completed|made|performed|assessed|evaluated|explored|reviewed|clarified|decided|considered|looked\\s+at)\\s+(?:\\w+\\s+){0,2}?(?:by|at|in|with)\\s+(?:dps|you|the\\s+team|your\\s+team|specialists?|specialist\\s+services?|secondary\\s+care)(?![a-z])",
  "(?<![a-z])no\\s+(?:clear\\s+|full\\s+|good\\s+|real\\s+)?(?:overview|picture)(?![a-z])",
  "(?<![a-z])(?:awaiting|waiting\\s+for|await)\\s+(?:the\\s+|her\\s+|his\\s+|their\\s+|any\\s+)?(?:\\w+\\s+){0,2}?(?:records?|notes|letters?|information|details|reply|response|summar(?:y|ies)|documents?)(?![a-z])",
  "(?<![a-z])(?:a\\s+|an\\s+)?(?:conversation|appointment|consultation|review|follow-up|discussion|talk|meeting)\\s+(?:about\\s+(?:this|it|that)\\s+)?(?:is\\s+|has\\s+been\\s+|was\\s+)?(?:planned|scheduled|booked|arranged)(?![a-z])|(?<![a-z])(?:planned|scheduled|booked|arranged)\\s+(?:a\\s+|an\\s+)?(?:(?:double|longer|long|separate|new|further|extended|dedicated|follow-up)\\s+)?(?:conversation|appointment|consultation|review|follow-up|discussion|talk|meeting)(?![a-z])",
  "(?<![a-z])(?:requested|asked\\s+for|sent\\s+for|ordered|chased)\\s+(?:the\\s+|her\\s+|his\\s+|their\\s+)?(?:\\w+\\s+)?(?:information|info|details|records?|notes|reports?|letters?|statement|summar(?:y|ies))(?![a-z])",
  "(?<![a-z])(?:dps|you|your\\s+team|camhs|specialist\\s+services?)\\s+(?:\\w+\\s+)?(?:has|have|hold|holds)\\s+(?:\\w+\\s+)?(?:more|better|fuller|full|a\\s+fuller|a\\s+better)\\s+(?:information|info|details|records?|notes|overview|picture)(?![a-z])",
  "(?<![a-z])(?:needs?|requires?|warrants?)\\s+(?:further\\s+|more\\s+)?(?:clarif\\w*|checking|confirm\\w*|exploring|exploration|review(?:ing)?|verif\\w*|looking\\s+into|investigat\\w*|follow(?:ing)?[- ]up)(?![a-z])",
  "(?<![a-z])(?:lack|lacks|lacking)\\s+(?:an?\\s+|the\\s+|any\\s+)?(?:\\w+\\s+)?(?:overview|picture|idea|information|details)(?![a-z])",
  "(?<![a-z])for\\s+(?:dps|you|the\\s+team|your\\s+team|the\\s+specialists?|(?:the\\s+)?specialist\\s+(?:team|services?))\\s+to\\s+(?:assess|evaluate|explore|decide|map|judge|determine|consider|review|check|clarify|look\\s+(?:at|into))|(?<![a-z])(?:dps|you)\\s+(?:will\\s+)?(?:need|needs|must|should|will\\s+have)\\s+to\\s+(?:\\w+\\s+)?(?:assess|evaluate|get|obtain|check|request|map)",
  "(?<![a-z])(?:come|get)\\s+back\\s+to\\s+(?:this|it|that|you)|(?<![a-z])return\\s+to\\s+(?:this|it|that)|(?<![a-z])(?:will|shall|['’]ll|to)\\s+(?:\\w+\\s+)?(?:return|come\\s+back|get\\s+back)\\s+to(?![a-z])",
  // Norwegian: the patient does not remember whether, the GP has no knowledge of it or no clear picture, got no further, or the patient
  // would rather take it up with DPS, or turned the questions away.
  '(?<!\\p{L})(?:(?:husker|husket|minnes|huske)\\s+(?:\\p{L}+\\s+)?ikke|ikke\\s+(?:husker|husket|minnes|huske))\\s+(?:om|hvorvidt)(?!\\p{L})',
  '(?<!\\p{L})(?:ikke|ingen|uten)\\s+(?:\\p{L}+\\s+)?kjennskap\\s+til|(?<!\\p{L})(?:jeg|vi|så)\\s+vet\\s+(?:jeg\\s+|vi\\s+)?ikke(?!\\s+(?:selv|lenger))(?!\\p{L})',
  '(?<!\\p{L})ikke\\s+(?:\\p{L}+\\s+){0,2}?(?:fått|har|hatt|dannet)\\s+(?:meg\\s+)?(?:et\\s+)?(?:klart\\s+|godt\\s+|helt\\s+|fullt\\s+|tydelig\\s+)?(?:bilde|inntrykk)(?!\\p{L})|(?<!\\p{L})(?:kom|kommer|komme)\\s+(?:jeg\\s+|vi\\s+)?ikke\\s+(?:lenger|videre)(?!\\p{L})',
  '(?<!\\p{L})heller\\s+(?:\\S+\\s+){0,6}?(?:dps|behandler\\p{L}*|spesialist\\p{L}*|psykiater\\p{L}*|psykolog\\p{L}*)(?!\\p{L})|(?<!\\p{L})(?:avvis|avslo|avslår|nekt|vegr|unnvik|unngikk|unngår)\\p{L}*\\s+(?:\\p{L}+\\s+)?(?:spørsmål\\p{L}*|tema\\p{L}*)(?!\\p{L})',
  '(?<!\\p{L})for\\s+(?:\\p{L}+\\s+){1,2}til\\s+å\\s+(?:svare|snakke|prate|gå\\s+inn\\s+på|gjennomføre|fullføre)(?!\\p{L})',
  // English: the same.
  "(?:can['’]?t|cannot|couldn['’]t|could\\s+not|doesn['’]t|does\\s+not|didn['’]t|did\\s+not|don['’]t|do\\s+not|unable\\s+to|not\\s+able\\s+to)\\s+(?:\\w+\\s+)?(?:recall|remember|tell|say)\\s+(?:me\\s+|us\\s+|you\\s+)?(?:whether|if)(?![a-z])",
  "(?:n['’]t|(?<![a-z])not)\\s+(?:\\w+\\s+)?aware\\s+(?:of|whether|if)|(?<![a-z])unaware\\s+of|(?<![a-z])(?:i|we|so)\\s+(?:do\\s+not|don['’]?t)\\s+know(?![a-z])",
  "(?:n['’]t|(?<![a-z])(?:not|no))\\s+(?:\\w+\\s+){0,2}?(?:get|got|have|had|form|formed)\\s+(?:an?\\s+|the\\s+|any\\s+)?(?:clear\\s+|full\\s+|good\\s+|proper\\s+|complete\\s+)?(?:picture|overview|idea|sense)(?![a-z])",
  "(?<![a-z])(?:declin|refus|avoid|deflect|dodg|sidestep|brush)\\w*\\s+(?:\\w+\\s+){0,2}?questions?(?![a-z])|(?<![a-z])rather\\s+(?:\\S+\\s+){0,6}?(?:dps|specialist\\w*|the\\s+team|psychiatr\\w*|psycholog\\w*)(?![a-z])",
  "(?<!\\p{L})(?:answered|said|replied|svarte|sa)\\s+['‘’\"«]?(?:pass|no\\s+comment|rather\\s+not|ingen\\s+kommentar|vil\\s+ikke\\s+svare)(?!\\p{L})",
  "(?<![a-z])too\\s+(?:\\w+\\s+){1,2}to\\s+(?:\\w+\\s+){0,2}?(?:get\\s+through|answer|discuss|talk|go\\s+into|engage|complete|finish|cover)(?![a-z])|(?:wasn['’]t|was\\s+not|weren['’]t|were\\s+not)\\s+able\\s+to(?=\\s*[.,;:!]|\\s*$)",
  "(?<![a-z])(?:appreciate|welcome|value|grateful\\s+for)\\s+(?:dps|you|your\\s+team|the\\s+team|specialists?|the\\s+specialists?)\\s+(?:\\w+\\s+)?(?:looking\\s+(?:at|into)|assessing|evaluating|exploring|reviewing|checking|mapping|taking\\s+(?:a\\s+look|this\\s+on))",
  // Norwegian: please check, records not had, would not talk (other word order), did not press, would not let the GP write or call,
  // agreed to take it up later, or a wish for treatment or admission («Ønsker ikke innleggelse», «Behandlingsbehov: samtaleterapi»).
  '(?<!\\p{L})(?:vennligst|venligst|vær\\s+så\\s+snill\\s+og)\\s+(?:\\p{L}+\\s+)?(?:sjekk|innhent|se|vurder|kartlegg|avklar|undersøk)\\p{L}*',
  '(?<!\\p{L})ikke\\s+(?:\\p{L}+\\s+)?(?:fått|mottatt)\\s+(?:\\p{L}+\\s+)?(?:journal\\p{L}*|epikris\\p{L}*|notat\\p{L}*|papir\\p{L}*|opplysning\\p{L}*)',
  '(?<!\\p{L})ikke\\s+(?:\\p{L}+\\s+)?(?:villet|ønsket|orket|turt|likt|liker|vil|ønsker|orker|tør)\\s+(?:å\\s+)?(?:snakke|prate|svare|fortelle|si|gå\\s+inn\\s+på|utdype|dele)(?!\\p{L})|(?<!\\p{L})(?:presset|presse|presser|pushet|maste)\\s+(?:jeg\\s+|vi\\s+)?ikke(?!\\p{L})',
  '(?<!\\p{L})(?:ønsket|ønsker|ville|vil)\\s+ikke\\s+at\\s+(?:jeg|vi|legen|fastlegen)\\s+(?:\\p{L}+\\s+)?(?:skriver|skrev|nevner|nevnte|tar|tok|forteller|fortalte|kontakter|kontaktet|snakker|snakket|ringer|ringte)(?!\\p{L})',
  '(?<!\\p{L})avtal\\p{L}*\\s+(?:at\\s+vi\\s+skal\\s+|å\\s+)(?:snakke|ta\\s+opp|gå\\s+gjennom|se\\s+på|komme\\s+tilbake)',
  '(?<!(?:hadde|har\\s+hatt|tidligere|før)\\s+)(?<!\\p{L})(?:har\\s+lyst\\s+(?:til|på)|kunne\\s+tenke\\s+seg|ønsker|vil\\s+(?:helst\\s+|gjerne\\s+|heller\\s+)?(?:ha|til|gå\\s+til|prøve|begynne\\s+(?:hos|i|med|på)|starte\\s+(?:med|i|hos|på))|motivert\\s+for|\\p{L}*behov(?:\\s+for)?|trenger|foretrekker)(?:\\s+ikke)?\\s*:?\\s+(?:\\p{L}+\\s+){0,5}?(?:\\p{L}*behandling\\p{L}*|innleggelse\\p{L}*|\\p{L}*terapi\\p{L}*|samtale\\p{L}*|poliklini\\p{L}*|medisin\\p{L}*|medikament\\p{L}*|tablett\\p{L}*|psykolog\\p{L}*|psykiater\\p{L}*|terapeut\\p{L}*|rask\\s+psykisk\\p{L}*|helsehjelp)(?!\\p{L})',
  // Norwegian: asked for records, will add to the referral later, DPS has more, best assessed by DPS (r8F-04).
  '(?<!\\p{L})(?:bedt|ba|be)\\s+om\\s+(?:\\p{L}+\\s+){0,2}?(?:opplysning\\p{L}*|informasjon|info|journal\\p{L}*|epikris\\p{L}*|uttalelse\\p{L}*|rapport\\p{L}*|notat\\p{L}*|papir\\p{L}*|dokumentasjon)(?!\\p{L})|(?<!\\p{L})(?:vil|skal)\\s+(?:\\p{L}+\\s+)?(?:supplere|oppdatere|ettersende|komplettere|fylle\\s+(?:ut|inn))(?!\\p{L})',
  '(?<!\\p{L})(?:avventer|venter\\s+på)\\s+(?:\\p{L}+\\s+){0,2}?(?:journal\\p{L}*|epikris\\p{L}*|opplysning\\p{L}*|papir\\p{L}*|notat\\p{L}*|svar\\p{L}*|dokumentasjon)(?!\\p{L})',
  '(?<!\\p{L})(?:planlagt|avtalt|satt\\s+opp|booket|bestilt)\\s+(?:(?:ny|en|egen|lengre|lang|dobbel)\\s+)?\\p{L}*(?:samtale|time|konsultasjon|kontroll|oppfølging|vurdering)\\p{L}*(?!\\p{L})|(?<!\\p{L})(?:samtale|time|konsultasjon|kontroll|oppfølging)\\p{L}*\\s+(?:om\\s+(?:dette|det|temaet)\\s+)?(?:er\\s+)?(?:planlagt|avtalt|satt\\s+opp|booket|bestilt)(?!\\p{L})',
  '(?<!\\p{L})(?:dps|dere|spesialist\\p{L}*|bup)\\s+(?:\\p{L}+\\s+)?(?:har|sitter\\s+(?:med|på))\\s+(?:\\p{L}+\\s+)?(?:mer|bedre|fullere|full)\\s+(?:informasjon|opplysninger|oversikt|info)(?!\\p{L})|(?<!\\p{L})(?:best|bedre|helst)\\s+(?:vurdert|kartlagt|ivaretatt|utredet|undersøkt)\\s+(?:av|hos|ved|i)\\s+(?:dps|dere|spesialist\\p{L}*)(?!\\p{L})',
  '^(?:evt\\.?|eventuelt|ev\\.|vurdere|vurderer)\\s+(?:\\p{L}+\\s+){0,3}?(?:\\p{L}*behandling\\p{L}*|innleggelse\\p{L}*|\\p{L}*terapi\\p{L}*|medisin\\p{L}*|medikament\\p{L}*|vurdering)',
  '(?<!\\p{L})(?:jeg\\s+)?(?:har\\s+)?vært\\s+(?:\\p{L}+\\s+)?fastlege\\p{L}*\\s+(?:for|til|i)(?!\\p{L})',
  // English: the same.
  "(?<![a-z])(?:asked|told)\\s+me\\s+not\\s+to\\s+(?:mention|write|include|say|contact|speak|tell|phone|call)|(?:did\\s+not|didn['’]t|does\\s+not|doesn['’]t|would\\s+not|wouldn['’]t)\\s+want\\s+me\\s+to\\s+(?:mention|write|include|say|contact|speak|tell|phone|call)",
  "(?<![a-z])(?:i|we)\\s+(?:left|leave)\\s+it(?:\\s+(?:this\\s+time|for\\s+now|there|today|at\\s+that))?(?=\\s*[.,;:!]|\\s*$)|(?<![a-z])(?:did\\s+not|didn['’]t)\\s+(?:push|press)(?![a-z])",
  "(?<![a-z])(?:agreed|arranged|planned?|decided)\\s+to\\s+(?:talk|discuss|go\\s+(?:through|over)|look\\s+at|cover|return\\s+to|come\\s+back\\s+to|revisit)\\s+(?:about\\s+)?(?:\\w+\\s+){0,4}?(?:at|on|next|when|later|after|in)(?![a-z])",
  "(?:n['’]t|(?<![a-z])(?:not|no))\\s+(?:\\w+\\s+){0,2}?(?:have|got|received|obtained|seen)\\s+(?:the\\s+|her\\s+|his\\s+|their\\s+|any\\s+)?(?:old\\s+|previous\\s+|past\\s+)?(?:notes|records?|journal|letters?)(?![a-z])",
  "(?:did\\s+not|didn['’]t|never)\\s+get\\s+(?:on\\s*)?to\\s+(?:\\w+\\s+){0,5}?(?:today|this\\s+time)(?![a-z])",
  "(?<![a-z])(?:wants?|would\\s+(?:like|prefer|love|really\\s+like|welcome|value)|really\\s+wants?|hop(?:es|ing)\\s+to|wish(?:es)?\\s+to|prefers?|keen\\s+(?:on|to)|(?:is\\s+)?motivated\\s+for|needs?|in\\s+need\\s+of|hoping\\s+for|asking\\s+for)\\s+(?:\\w+\\s+){0,3}?(?:treatment|admission|therapy|talking|counselling|counseling|outpatient|medication|tablets|psycholog\\w*|psychiatr\\w*|therapist|counsell?or|cbt|dbt)(?![a-z])|(?<![a-z])(?:keen|wants?|wishes)\\s+to\\s+avoid\\s+(?:\\w+\\s+)?admission",
  "(?<![a-z])i\\s+(?:have\\s+|['’]ve\\s+)?(?:looked\\s+after|known|treated)\\s+(?:the\\s+)?(?:whole\\s+)?(?:family|her|him|them)\\s+(?:for|since)(?![a-z])",
  // An idiom that hands the question to DPS, and not knowing the patient well enough (r10F-03).
  '(?<!\\p{L})ballen\\s+(?:ligger|er)\\s+(?:\\p{L}+\\s+)?(?:hos|over\\s+til)\\s+(?:dere|dps|deg|spesialist\\p{L}*)(?!\\p{L})|(?<!\\p{L})kjenner\\s+(?:(?:jeg|vi)\\s+)?ikke\\s+(?:pasienten|pas\\.?|henne|ham|han|dem|familien)\\s+(?:\\p{L}+\\s+)?(?:godt|nok)(?!\\p{L})',
  "(?<![a-z])ball['’]?s?\\s+(?:is\\s+)?(?:now\\s+)?in\\s+(?:your|dps['’]?s?|the\\s+(?:team|specialists?)['’]?s?)\\s+court|(?<![a-z])over\\s+to\\s+(?:you|dps|the\\s+team|the\\s+specialists?)(?![a-z])|(?<![a-z])(?:do\\s+not|don['’]?t|dont)\\s+know\\s+(?:her|him|them|the\\s+patient|the\\s+family)\\s+(?:\\w+\\s+)?(?:well|enough)(?![a-z])",
);

/**
 * The same, at the start of a clause with no subject, where only the GP speaks: «Kommer tilbake med mer.», «Tar dette når vi ses.»,
 * «Får vurdert dette ved kontroll.», «Ikke hatt tid.», «Will update once I have seen her.», «No time for a risk assessment.»
 */
const NOT_START = new RegExp(
  '^(?:' +
    [
      '(?:(?:jeg|vi)\\s+)?(?:har\\s+|hadde\\s+|fikk\\s+)?(?:ikke|ingen)\\s+(?:(?:hatt|fått)\\s+)?(?:tid|anledning|mulighet)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?kommer\\s+tilbake\\s+(?:til|med)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:tar|tas)\\s+(?:(?:dette|det|temaet|den)\\s+)?(?:opp\\s+)?(?:med\\s+(?:henne|ham|han|dem|pasienten|pas\\.?)\\s+)?(?:igjen\\s+)?(?:når|senere|seinere|neste|etter|ved\\s+(?:neste|kontroll\\p{L}*|ny\\p{L}*|oppfølging\\p{L}*)|på\\s+neste)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:spør|sjekker|kartlegger|vurderer|undersøker|avklarer|innhenter|går\\s+gjennom|ser\\s+på|tar\\s+opp)\\s+(?:\\p{L}+\\s+){0,4}?(?:ved\\s+neste|neste\\s+gang|på\\s+neste|senere|seinere|etter\\s+hvert|når|i\\s+neste|om\\s+(?:en|ei|to|tre|fire|\\d+)|ved\\s+kontroll\\p{L}*|ved\\s+ny\\p{L}*|til\\s+neste)(?!\\p{L})',
      "(?:(?:i|we)\\s+)?(?:will|shall)\\s+ask(?!\\s+for)(?![a-z])",
      '(?:(?:jeg|vi)\\s+)?(?:får|skal\\s+få|må\\s+få)\\s+(?:\\p{L}+\\s+)?(?:vurdert|kartlagt|sjekket|sett\\s+på|tatt\\s+opp|avklart|undersøkt|gått\\s+gjennom|innhentet|spurt)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:kan|klarer)\\s+ikke\\s+(?:si|svare|vurdere|bedømme|uttale)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:har\\s+)?(?:ikke|ingen|null)\\s+(?:\\p{L}+\\s+){0,2}(?:peiling|anelse)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?aner\\s+(?:(?:jeg|vi)\\s+)?ikke(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:gjør|gjennomfører|foretar|tar)\\s+(?:en\\s+|ny\\s+|grundig\\s+|full\\s+)?\\p{L}*(?:vurdering|kartlegging|screening|undersøkelse)\\p{L}*\\s+(?:\\p{L}+\\s+){0,3}?(?:når|ved|neste|senere|seinere|etter|om)(?!\\p{L})',
      '(?:helst|gjerne|fortrinnsvis|ideelt\\s+sett|preferably|ideally|if\\s+possible)(?!\\p{L})',
      '(?:(?:jeg|vi)\\s+)?(?:oppdaterer|ettersender|supplerer|kompletterer|fyller\\s+(?:ut|inn))(?!\\p{L})',
      "(?:(?:i|we)\\s+)?(?:will|shall)\\s+(?:\\w+\\s+){0,2}?(?:forward\\w*|send\\w*|updat\\w*|add\\w*|complet\\w*|fill\\w*\\s+(?:in|out)|provid\\w*|suppl\\w*|let\\s+you\\s+know|get\\s+back|come\\s+back|follow\\s+up|revert)",
      "(?:(?:i|we)\\s+)?(?:(?:had|have|got)\\s+)?no\\s+time(?![a-z])",
      "(?:(?:i|we)\\s+)?(?:did\\s+not|didn['’]t)\\s+have\\s+(?:the\\s+|enough\\s+)?time",
      "(?:(?:i|we)\\s+)?(?:can['’]?t|cannot|could\\s+not|couldn['’]t)\\s+(?:say|comment|tell|judge|answer)(?![a-z])",
      '(?:(?:jeg|vi)\\s+)?(?:får|må|skal)\\s+(?:(?:jeg|vi)\\s+)?(?:se\\s+(?:nærmere\\s+)?på|ta\\s+opp|vurdere|sjekke|spørre|kartlegge|gå\\s+gjennom)\\s+(?:\\p{L}+\\s+){0,4}?(?:når|senere|seinere|neste|ved|etter|om)(?!\\p{L})',
      "(?:(?:i|we)\\s+)?(?:(?:have|has)\\s+not|haven['’]?t|hasn['’]?t|(?:do|does)\\s+not\\s+have|don['’]?t\\s+have)\\s+(?:got\\s+)?(?:the\\s+)?(?:foggiest|faintest)(?![a-z])",
    ].join('|') +
    ')',
  'iu',
);

/** A somatic illness: an aside in a section about something else, and, under «Tidligere behandling», not mental health care. */
const SOMATIC =
  '(?<!\\p{L})(?:astma\\p{L}*|kols(?:en)?|diabet\\p{L}*|hypotyreose\\p{L}*|hypertyreose\\p{L}*|stoffskifte\\p{L}*|hjerteinfarkt\\p{L}*|angina|hjertesvikt\\p{L}*|atrieflimmer\\p{L}*|epilep\\p{L}*|migren\\p{L}*|psoriasis|eksem(?:et|er|ene)?|crohn\\p{L}*|ulcerøs\\s+kolitt|\\p{L}*kreft(?:en|syk\\p{L}*|behandling\\p{L}*)?|leddgikt\\p{L}*|revmat\\p{L}*|artros\\p{L}*|multippel\\s+sklerose|parkinson\\p{L}*|hepatitt\\p{L}*|høyt\\s+blodtrykk|hypertensjon\\p{L}*|kolesterol\\p{L}*|fibromyalgi\\p{L}*|prolaps\\p{L}*|hjerneslag\\p{L}*|nyresvikt\\p{L}*|cøliaki\\p{L}*|søvnapn\\p{L}*|' +
  'operer\\p{L}*|operasjon\\p{L}*|\\p{L}*brokk(?:en|et)?|fysioterap\\p{L}*|fysio|antibiotika\\p{L}*|lungebetennelse\\p{L}*|ryggen|rygg(?:smert|plage|problem)\\p{L}*|' +
  'asthma\\w*|copd|hypothyroid\\w*|hyperthyroid\\w*|heart\\s+attack|myocardial\\s+infarction|heart\\s+failure|atrial\\s+fibrillation|epilep\\w*|migraine\\w*|eczema|crohn\\W?s|ulcerative\\s+colitis|\\w*cancer\\w*|arthritis|rheumat\\w*|multiple\\s+sclerosis|hepatitis|high\\s+blood\\s+pressure|hypertension|cholesterol|fibromyalgia|stroke|kidney\\s+(?:disease|failure)|coeliac|celiac|sleep\\s+apno?ea|gout|(?:hip|knee)\\s+replacement|' +
  'hernia\\w*|physio\\w*|antibiotic\\w*|pneumonia|operated|operation|back\\s+pain|bad\\s+back)(?!\\p{L})';
const SOMATIC_RE = new RegExp(SOMATIC, 'iu');
const MENTAL_HEALTH = new RegExp(
  '(?<!\\p{L})(?:psyk|psych|mental|nerv|depres|angst|anxi|panic|panikk|terapi|therap|samtale|counsel|kognitiv|mentaliser|rask\\s+psykisk|dps|bup|camhs|cmht|iapt|vpp|cbt|dbt|emdr|ssri|snri|antidepress|sertralin|escitalopram|fluoksetin|fluoxetin|venlafa|mirtazapin|citalopram|paroksetin|paroxetin|duloksetin|duloxetin|vortioksetin|vortioxetin|bupropion|litium|lithium|quetiapin|olanzapin|aripiprazol|lamotrigin|klozapin|clozapin|risperidon|haloperidol|lurasidon|metylfenidat|methylphenidat|lisdeks|lisdex|atomoksetin|atomoxetin)',
  'iu',
);

/** «Tidligere behandling»: a plan, a wish or this referral is not treatment that was given («Planlegger å starte sertralin.», "Referred for treatment."). */
const NOT_PREVIOUS = new RegExp(
  [
    '(?<!\\p{L})(?:planlegger|tenker|vurderer|skal|vil)\\s+(?:å\\s+)?(?:starte|begynne|prøve|sette\\s+i\\s+gang|søke)(?!\\p{L})',
    '(?<!\\p{L})henvises\\s+(?:nå\\s+)?(?:for|til|med\\s+tanke\\s+på)\\s+(?:\\p{L}+\\s+){0,2}?(?:behandling|utredning|vurdering|terapi|oppfølging)',
    '(?<![a-z])(?:plan(?:s|ning)?|planned|intend(?:s|ing)?|going|will|would\\s+like|wants?)\\s+(?:to\\s+)?(?:start|begin|commence|try|initiate)(?![a-z])',
    '^(?:now\\s+)?(?:(?:she|he|they|the\\s+patient|pt)\\s+(?:is|are)\\s+(?:being\\s+|now\\s+)?)?(?:now\\s+)?referr(?:ed|ing)\\s+(?:now\\s+|here\\s+|to\\s+you\\s+)?(?:for|to)\\s+(?:\\w+\\s+){0,2}?(?:treatment|assessment|therapy|evaluation|follow-up)',
    '^(?:plan(?:en)?|videre\\s+plan|tiltak|further\\s+plan|management)\\s*:',
  ].join('|'),
  'iu',
);
/** What makes a plan sit beside treatment that was given, so the clause still counts: «har prøvd …», "previously", a year. */
/** A verb of care or contact: a clause that names an illness under «Tidligere behandling» may still tell of treatment («Hadde en depresjon i 2018.»). */
const CARE_VERB =
  /(?<!\p{L})(?:har|hadde|hatt|vært|var|gått|gikk|fått|fikk|brukt|brukte|prøvd|prøvde|møtt|møtte|sett|gjennomgått|gjennomgikk|has|have|had|was|were|been|seen|saw|tried|used|attended|went|got|received|completed|started|stopped|deltok|deltatt|fulgte|fulgt|gjennomførte|gjennomført|did|done|took|followed|kurs\p{L}*|course\w*|program\w*|gruppe\p{L}*|group\w*)(?!\p{L})/iu;
const PAST_TREATMENT = /(?<!\p{L})(?:har\s+(?:vært|gått|fått|brukt|prøvd|hatt|stått)|hadde|tidligere|før|i\s+(?:19|20)\d\d|has\s+(?:been|had|tried|seen|used)|had|previously|before|was|were|tried|in\s+(?:19|20)\d\d)(?!\p{L})/iu;

/**
 * Weaker signs that a clause says nothing about the criterion, read only when the clause names none of it: the consultation itself
 * («Timen handlet mest om medisinering.», «Telefonkonsultasjon med dårlig forbindelse.»), why the patient is referred, a test result,
 * who the GP is to the patient («Ny på lista.»), or the patient did not remember or was not sure.
 */
const ASIDE = anyOf(
  '(?<!\\p{L})(?:timen|konsultasjonen|samtalen|fokus(?:et)?|hovedfokus(?:et)?|tiden)\\s+(?:i\\s+dag\\s+)?(?:var|ble|gikk|handlet|dreide\\s+seg)\\s+(?:\\p{L}+\\s+){0,3}?(?:på|om|med|til|kort|travel|avbrutt|forstyrret|preget)(?!\\p{L})',
  '(?<![a-z])(?:(?:most|much|all|the\\s+rest)\\s+of\\s+)?(?:the\\s+|today[’\']s\\s+|this\\s+)?(?:consultation|appointment|session|visit|time)\\s+(?:today\\s+)?(?:was|went|were)\\s+(?:\\w+\\s+){0,3}?(?:on|about|spent|taken\\s+up|dominated|used|rushed|short|brief|cut\\s+short|interrupted|hurried)(?![a-z])',
  '(?<![a-z])(?:the\\s+)?focus\\s+(?:today\\s+)?(?:was|were)\\s+(?:\\w+\\s+){0,2}?on(?![a-z])|(?<![a-z])(?:we|i)\\s+focus\\w*\\s+on(?![a-z])|(?<!\\p{L})fokuserte\\s+(?:vi\\s+|jeg\\s+)?på(?!\\p{L})',
  '(?<!\\p{L})(?:telefonkonsultasjon|telefontime|telefonsamtale|videokonsultasjon|videotime|tolk(?:en|et)?|dårlig\\s+forbindelse|språkbarriere\\p{L}*)(?!\\p{L})',
  '(?<![a-z])(?:phone|telephone|video)\\s+(?:consultation|call|appointment|review)|(?<![a-z])(?:by|over\\s+the)\\s+(?:phone|telephone|video)(?![a-z])|(?<![a-z])interpreter|(?<![a-z])(?:poor|bad)\\s+(?:line|connection)|(?<![a-z])language\\s+barrier',
  '(?<![a-z])only\\s+(?:had|got)\\s+(?:\\d+|ten|five|fifteen|twenty|a\\s+few)\\s+min|(?<![a-z])(?:mostly|mainly|largely|all)\\s+(?:spent|taken\\s+up|used)\\s+(?:on|with|by)(?![a-z])|(?<!\\p{L})(?:hadde|fikk)\\s+(?:bare|kun)\\s+(?:\\d+|ti|fem|femten|tjue|noen)\\s+min|(?<!\\p{L})gikk\\s+med\\s+til(?!\\p{L})',
  '(?<!\\p{L})(?:henvis\\p{L}*|referred|referral|referring)\\s+(?:\\p{L}+\\s+){0,3}?(?:for|til|with|pga\\.?|på\\s+grunn\\s+av|grunnet|because|due|med\\s+(?:spørsmål|tanke))(?!\\p{L})|(?<![a-z])(?:main|presenting|chief)\\s+(?:complaint|problem|concern|issue)|(?<!\\p{L})hoved(?:plage|problem|symptom|grunn|årsak)\\p{L}*',
  '(?<!\\p{L})(?:bmi|bt|blodtrykk\\p{L}*|puls|hb|crp|tsh|ft4|hba1c|b12|folat|ferritin|vekt|blodprøve\\p{L}*|prøvesvar\\p{L}*|ekg|røyk\\p{L}*|snus|bloods?|blood\\s+(?:tests?|pressure|results?)|bp|pulse|weight|ecg|smok\\w*|cigarettes?|labs?|thyroid|promille|alkotest|breathalys\\w*|blood\\s+alcohol|bac|urinprøve\\p{L}*|rusprøve\\p{L}*|rustest\\p{L}*|urin|urine|drug\\s+(?:screen|test)\\w*|tox\\w*\\s+screen\\w*)(?!\\p{L})',
  '(?<!\\p{L})(?:konsultasjon|time|samtale)\\p{L}*\\s+(?:på\\s+)?(?:ca\\.?\\s+)?\\d+\\s*(?:min|minutter)(?!\\p{L})|(?<!\\p{L})(?:god|fin|grei|dårlig)\\s+(?:kontakt|allianse)(?!\\p{L})|(?<!\\p{L})(?:samarbeidende|samarbeidsvillig)(?!\\p{L})',
  "(?<![a-z])\\d+[- ]?min(?:ute)?s?\\s+(?:consultation|appointment|session|call)|(?<![a-z])(?:consultation|appointment|session)\\s+(?:of\\s+|lasting\\s+)?\\d+\\s*min|(?<![a-z])(?:good|fair|poor)\\s+(?:rapport|engagement)(?![a-z])|(?<![a-z])(?:cooperative|co-operative|tidy)(?![a-z])",
  '^(?:pasienten|pas\\.?|hun|han|the\\s+patient|she|he|pt)\\s+(?:er|is)\\s+(?:nå\\s+|now\\s+)?\\d+(?:\\s*(?:år|years?))?(?:\\s+(?:gammel|old))?[\\s.!]*$',
  SOMATIC,
  '(?<!\\p{L})(?:phq|gad|madrs|hads|bdi|audit|mdq|asrs|epds|ybocs|cgi)(?!\\p{L})|(?<!\\p{L})(?:diagnos\\p{L}*|dx|known\\s+with|kjent\\s+med(?!\\s+(?:selvskad|suicid|vold|rus))|har\\s+diagnosen)(?!\\p{L})|(?<![\\p{L}\\d])[FZ]\\d{2}(?:\\.\\d+)?(?!\\d)|(?<![a-z])query\\s+[a-z]',
  '(?<!\\p{L})(?:timen|konsultasjonen|samtalen)\\s+(?:varte|tok)|(?<!\\p{L})i\\s+(?:konsultasjonen|timen|samtalen)(?!\\p{L})|(?<![a-z])(?:in|during)\\s+the\\s+(?:consultation|appointment|session)(?![a-z])|(?<![a-z])(?:the\\s+)?(?:consultation|appointment|session)\\s+(?:was|lasted|took)\\s+(?:\\w+\\s+){0,2}?(?:long|lengthy|emotional|difficult|tense|hours?|minutes)',
  '(?<!\\p{L})(?:vikar\\p{L}*|locum)(?!\\p{L})|(?<!\\p{L})(?:bare|kun)\\s+(?:møtt|sett|truffet)\\s+(?:\\p{L}+\\s+)?(?:én|en|ett|1)\\s+gang|(?<![a-z])only\\s+(?:seen|met)\\s+(?:\\w+\\s+)?once',
  '(?<![a-z])(?:we|vi)\\s+(?:have|har)\\s+(?:a\\s+)?(?:good|god|fin|nær|close|trusting)\\s+(?:relationship|kontakt|relasjon|allianse)|(?<!\\p{L})(?:comes|møter)\\s+(?:\\p{L}+\\s+)?(?:to|til|på)\\s+(?:(?:her|his|avtalte)\\s+)?(?:appointments|timer|timene)(?!\\p{L})',
  '(?<!\\p{L})henvisningen\\s+gjelder|(?<![a-z])the\\s+referral\\s+(?:is\\s+)?(?:about|concerns|regards)|(?<!\\p{L})ikke\\s+(?:\\p{L}+\\s+)?(?:fått\\s+tak\\s+i|fått\\s+kontakt\\s+med|nådd)|(?:n[\'’]t|(?<![a-z])not)\\s+(?:been\\s+able\\s+to\\s+)?(?:reach|get\\s+hold\\s+of)(?![a-z])',
  '(?<!\\p{L})(?:ny|nytt)\\s+(?:på\\s+(?:lista|listen)|pasient)|(?<![a-z])(?:new|joined)\\s+(?:to\\s+)?(?:the\\s+|my\\s+)?(?:list|practice|patient)|(?<![a-z])(?:only|first)\\s+(?:seen|met|time)|(?<!\\p{L})(?:vært|been)\\s+(?:hennes|hans|deres|her|his|their)\\s+(?:fastlege|lege|gp|doctor)|' +
    '(?<![a-z])(?:transferred|moved)\\s+(?:here\\s+)?from\\s+(?:a\\s+|another\\s+)?(?:practice|gp|surgery)|(?<!\\p{L})kjenner\\s+(?:familien|henne|ham|han)\\s+(?:godt|lite|dårlig)|(?<![a-z])know\\s+(?:the\\s+family|her|him)\\s+(?:well|little)',
  '(?<!\\p{L})(?:husker|husket|minnes)\\s+(?:\\p{L}+\\s+)?ikke(?!\\p{L})',
  "(?<![a-z])(?:can['’]?t|cannot|couldn['’]t|could\\s+not|doesn['’]t|does\\s+not|didn['’]t|did\\s+not|don['’]t|do\\s+not)\\s+(?:\\w+\\s+)?(?:recall|remember)(?![a-z])",
  '^(?:trolig|sannsynlig(?:vis)?|mulig(?:ens)?|antatt|mistenkt|mistanke\\s+om|probable|probably|possible|possibly|likely|suspected)\\s+(?:\\S+\\s+){0,3}?\\S+[\\s.!]*$',
  '(?<!\\p{L})(?:kom|kommer|møtte|møter|ankom)\\s+(?:\\p{L}+\\s+){0,4}?(?:presis|punktlig|i\\s+tide|for\\s+sent|alene|til\\s+(?:timen|time\\p{L}*|avtalt\\s+tid|konsultasjonen)|sammen\\s+med|i\\s+følge\\s+med|med\\s+(?:sin\\s+|hennes\\s+|hans\\s+)?(?:mor|moren|mora|far|faren|foreldr\\p{L}*|samboer\\p{L}*|kjæreste\\p{L}*|mannen|kona|ektefelle\\p{L}*|partner\\p{L}*|venn\\p{L}*|venninne\\p{L}*|søster\\p{L}*|bror\\p{L}*|datter\\p{L}*|dattera|sønn\\p{L}*|tolk\\p{L}*))(?!\\p{L})|(?<!\\p{L})(?:godt|pent|ryddig|adekvat)\\s+kledd|(?<!\\p{L})(?:velkledd|velstelt)(?!\\p{L})|(?<!\\p{L})(?:konsultasjon(?:en)?|timen|samtalen)\\s+(?:i\\s+dag\\s+)?sammen\\s+med',
  "(?<![a-z])(?:arrived|came|comes|attended|attends)\\s+(?:\\w+\\s+){0,2}?(?:on\\s+time|punctual\\w*|early|late|alone|on\\s+(?:her|his|their)\\s+own|to\\s+(?:the|her|his|their)\\s+(?:appointment|consultation|clinic|surgery|session)|with\\s+(?:her|his|their)\\s+\\w+|accompanied|together\\s+with)(?![a-z])|(?<![a-z])(?:well|smartly|appropriately|neatly)[- ](?:dressed|kempt|groomed|presented)|(?<![a-z])seen\\s+(?:today\\s+)?(?:with|together\\s+with|alongside)\\s+(?:her|his|their)(?![a-z])",
  // A plan line, an age or a home with nothing else, the waiting room, how long the talk took, rapport, a short consultation,
  // waiting to see (r10F-03).
  '^(?:plan(?:en)?|videre\\s+plan|plan\\s+videre|tiltak|further\\s+plan|management)\\s*:',
  '^(?:(?:kvinne|mann|gutt|jente|woman|man|female|male|boy|girl)\\s*,?\\s*)?(?:på\\s+)?\\d+\\s*(?:år|years?)(?:\\s+(?:gammel|old))?[\\s.!]*$|^(?:kvinne|mann|gutt|jente|woman|man|female|male|boy|girl)[\\s.!]*$',
  '^(?:bor|bosatt|lives|living|resident)\\s+(?:i|in)\\s+\\S+[\\s.!]*$',
  '(?<!\\p{L})(?:venterom\\p{L}*|waiting\\s+room)(?!\\p{L})',
  '(?<!\\p{L})(?:ser|se)\\s+(?:det\\s+)?an(?!\\p{L})|(?<![a-z])see\\s+how\\s+(?:it|things|she|he|they)\\s+go(?:es)?(?![a-z])',
  '(?<![a-z])(?:short|brief|quick|rushed|hurried)\\s+(?:consultation|appointment|session|visit|call)(?![a-z])|(?<!\\p{L})(?:kort|travel)\\s+(?:konsultasjon|time|samtale)(?!\\p{L})',
  '(?<![a-z])(?:we\\s+|i\\s+)?(?:talked|spoke|chatted)\\s+for\\s+(?:about\\s+|around\\s+|over\\s+|nearly\\s+)?(?:half\\s+an\\s+hour|an\\s+hour|\\d+\\s*min\\w*|\\w+\\s+minutes)|(?<!\\p{L})(?:snakket|pratet)\\s+(?:i|en)\\s+(?:\\p{L}+\\s+)?(?:halvtime|time|\\d+\\s*min\\p{L}*)',
  '(?<![a-z])easy\\s+to\\s+(?:talk|speak)\\s+(?:to|with)|(?<![a-z])(?:was|is|seemed)\\s+(?:very\\s+|quite\\s+)?open(?=\\s*(?:[.,;:!]|$)|\\s+and\\s)|(?<!\\p{L})lett\\s+å\\s+(?:snakke|prate)\\s+med|(?<!\\p{L})(?:var|er|virket)\\s+(?:veldig\\s+|svært\\s+)?åpen(?=\\s*(?:[.,;:!]|$)|\\s+og\\s)',
);

/** The patient was not sure: an aside, except under risk, where a patient's doubt («om livet har noen mening») may be the finding (r8F-04). */
const PATIENT_UNSURE = anyOf(
  '(?<!\\p{L})(?:hun|han|pas\\.?|pasienten|de)\\s+(?:var|er|ble)\\s+(?:ikke\\s+)?(?:usikker|sikker)(?!\\p{L})',
  "(?<![a-z])(?:she|he|they|the\\s+patient)\\s+(?:was|is|were|are|wasn['’]t|isn['’]t|weren['’]t|aren['’]t)\\s+(?:not\\s+)?(?:sure|unsure|certain|uncertain)(?![a-z])",
);

/** The GP's own uncertainty at the start of a clause: «Vet ikke om …», «Usikker på …», «Unclear whether …», «Hard to say.» */
/** What may follow «ukjent», «unknown», «unclear» when they say the GP does not know: a question («om», «whether»), «for meg», or nothing. */
const NB_NOW = '(?:foreløpig|nå|enda|ennå|så\\s+langt|i\\s+dag|p(?:e)?r\\.?\\s+(?:nå|i\\s+dag|dags\\s+dato|d\\.\\s*d\\.?))';
const NB_WHICH = `(?=\\s*[.,;:!]?\\s*$|\\s+(?:om|hvorvidt|hva|hvor|hvordan|hvilk\\p{L}*|hvorfor|når|hvem|${NB_NOW}|for\\s+(?:meg|oss|undertegnede|fastlegen))(?!\\p{L}))`;
const EN_WHICH = '(?=\\s*[.,;:!]?\\s*$|\\s+(?:whether|if|what|how|when|who|which|why|at\\s+(?:present|this\\s+(?:point|stage|time))|for\\s+now|currently|to\\s+(?:me|us))(?![a-z]))';
const UNKNOWN_START = new RegExp(
  "^(?:(?:jeg|vi|i|we)\\s+|(?:det|dette)\\s+er\\s+(?:fortsatt\\s+|foreløpig\\s+|nok\\s+)?|it\\s+(?:is|remains)\\s+(?:still\\s+)?|it['’]s\\s+(?:still\\s+)?|(?:this|that)\\s+(?:is|remains)\\s+)?(?:" +
    [
      'vet\\s+(?:egentlig\\s+|faktisk\\s+)?(?:ikk(?:e|je)?|lite|for\\s+lite)(?!\\p{L})(?!\\s+(?:selv|lenger))',
      'kjenner\\s+(?:\\p{L}+\\s+)?(?:for\\s+)?(?:lite|dårlig)|kjenner\\s+ikke\\s+til',
      'er\\s+usikker',
      'usikkert?\\s+(?:på|om|hva|hvor|hvordan|hvilk\\p{L}*|når|hvorvidt)',
      `uklart?${NB_WHICH}`,
      'uvisst',
      `ukjent${NB_WHICH}`,
      'vites\\s+ikke',
      // «Ikke kjent for meg», not «Ikke kjent i psykisk helsevern» or «Ikke kjent med selvskading» (a finding).
      'ikke\\s+kjent(?:\\s+(?:for|av)\\s+(?:meg|oss|undertegnede|fastlegen)(?!\\p{L})|(?!\\s+(?:med|for|i|hos|ved|av|fra|blant|innen)(?!\\p{L})))',
      '(?:vanskelig|umulig|for\\s+tidlig)\\s+å\\s+(?:si|vurdere|bedømme|anslå|svare)',
      "(?:do\\s+not|don['’]?t|dont)\\s+(?:really\\s+|actually\\s+|honestly\\s+|quite\\s+)?(?:know|have\\s+(?:a\\s+)?(?:clear\\s+)?(?:picture|overview|idea))",
      'know\\s+(?:little|very\\s+little|too\\s+little)',
      'not\\s+sure(?!\\s+(?:herself|himself|themselves))',
      'unsure(?!\\s+(?:herself|himself|themselves))',
      `uncertain${EN_WHICH}|uncertain\\s+(?:about|of|as\\s+to|regarding)(?![a-z])`,
      `unclear${EN_WHICH}`,
      `unknown${EN_WHICH}`,
      // «Not known to me», not «Not known to services» or «Not known to self-harm» (a finding).
      'not\\s+known(?:\\s+(?:to|by)\\s+(?:me|us)(?![a-z])|(?!\\s+(?:to|by|in|at|with)(?![a-z])))',
      '(?:difficult|hard|impossible|too\\s+early)\\s+to\\s+(?:say|judge|assess|tell)',
      'have\\s+no\\s+(?:idea|information)',
      `no\\s+idea${EN_WHICH}`,
    ].join('|') +
    ')',
  'iu',
);

/** «Arbeidssituasjon og trygdestatus ukjent.», «Risk unknown at present.»: a short clause whose last word says it is not known. */
const UNKNOWN_END = new RegExp(
  `^(?:\\S+\\s+){0,6}?(?:er\\s+|is\\s+)?(?:ukjent|uavklart|uklart?|uviss?t?|unknown|unclear|uncertain|not\\s+known)(?:\\s+(?:at\\s+present|for\\s+now|so\\s+far|as\\s+yet|yet|to\\s+(?:me|us)|for\\s+(?:meg|oss)|${NB_NOW}))?[\\s.!]*$`,
  'iu',
);

function notStated(clause: string, value: string): boolean {
  return NOT_STATED.test(clause) || NOT_START.test(value);
}

function unknown(value: string): boolean {
  return UNKNOWN_START.test(value) || UNKNOWN_END.test(value);
}

/** Under risk, doubt about a risk that is there is a judgement of it: «Usikker på om hun klarer å motstå trangen.», «Unsure she can keep herself safe.» */
const PRESUPPOSED =
  /(?<!\p{L})(?:trang\p{L}*|impuls\p{L}*|motstå|holde\s+seg\s+(?:selv\s+)?trygg|ivareta\s+(?:seg\s+selv|egen\s+sikkerhet)|urges?|impulses?|resist\w*|keep\s+(?:her|him|them)sel(?:f|ves)\s+safe|stay\s+safe|keep\s+safe|benekt\p{L}*|avkreft\p{L}*|nekt\p{L}*|den(?:y|ies|ied|ying))(?!\p{L})/iu;

/** «Tidligere behandling»: that there was none is a finding: «Aldri vært i behandling.», «Not previously known to services.» */
const PRIOR_NONE = new RegExp(
  '(?<!\\p{L})(?:aldri|never|ikke\\s+tidligere|ingen\\s+tidligere|ikke\\s+før|tidligere\\s+ikke|not\\s+previously|no\\s+(?:previous|prior|past)|not\\s+(?:been\\s+)?(?:seen|known|treated|referred)\\s+(?:before|previously))\\s+' +
    '(?:\\S+\\s+){0,4}?\\S*(?:behandl|terapi|psykolog|psykiater|dps|bup|poliklin|innlagt|innleggelse|kontakt|henvist|vurdert|utredet|medisin|medikament|legemid|antidepress|samtale|oppfølging|psykisk\\s+helse|' +
    'spesialisthelse|treat|therap|psycholog|psychiatr|contact|referr|seen|assess|admi|medic|antidepress|counsel|mental\\s+health|services?|camhs|outpatient)',
  'iu',
);

const wordList = (words: string[]) => new RegExp(words.map((w) => `(?<!\\p{L})${w}(?!\\p{L})`).join('|'), 'iu');

/** What a risk to life and health is about. A strong word outweighs a job, money or a home in the same clause; a weak one only a bare «risk of». */
const SAFETY_STRONG = wordList([
  'suicid\\p{L}*', '\\p{L}*selvmord\\p{L}*', 'selvskad\\p{L}*', 'selvpåført\\p{L}*', '\\p{L}*vold\\p{L}*', 'aggres\\p{L}*', 'utager\\p{L}*', 'truende', 'truet', 'trussel\\p{L}*', 'trusler\\p{L}*',
  '\\p{L}*død\\p{L}*', 'dø', 'overdos\\p{L}*', 'forgift\\p{L}*', '\\p{L}*våpen\\p{L}*', '\\p{L}*kniv\\p{L}*', '\\p{L}*gevær\\p{L}*', '\\p{L}*tau(?:et)?', 'stup\\p{L}*',
  'avskjed\\p{L}*', 'testament\\p{L}*', 'harm\\w*', 'hurt\\w*', 'self', 'violen\\w*', 'aggress\\w*',
  'threat\\w*(?!\\s+to\\s+(?:terminate|evict|end|cut|stop|withdraw|sack|fire|dismiss|report))', 'death', 'dead', 'die', 'dying', 'kill\\w*', 'weapon\\w*', 'knife', 'guns?', 'rifle',
  'rope', 'cliff', 'police', 'politi\\p{L}*',
  // What an overdose is taken with, and how many: «tok 20 Paracet», «took 20 x 500 mg paracetamol».
  'paracet\\p{L}*', 'paralgin\\p{L}*', 'ibux', 'ibuprofen', 'pinex', 'sobril', 'vival', 'imovane', 'zopiklon', 'zopiclone', 'insulin', 'litium', 'lithium', 'tramadol', 'antifreeze', 'frostvæske',
  '(?:tok|svelget|inntok|took|swallowed|ingested)\\s+(?:ca\\.?\\s+|about\\s+|around\\s+|over\\s+)?\\d+',
  '(?:wrote|written|writing|made|making|updated)\\s+(?:a|his|her|their)\\s+will', 'testamente?', '(?:giving|gave|given|give)\\s+away', '(?:gitt|ga|gir|gi)\\s+bort',
]);
const SAFETY_WEAK = wordList([
  'andre', 'andres', 'leve', 'skad\\p{L}*', 'kontroll\\p{L}*', 'impuls\\p{L}*', 'kris\\p{L}*', 'innleggelse', 'beskyttende', 'sikkerhet\\p{L}*', 'trygg\\p{L}*',
  '\\p{L}*tablett\\p{L}*', '\\p{L}*piller?', '\\p{L}*medisin\\p{L}*', '\\p{L}*bro(?:a|en)?', '\\p{L}*bru(?:a|en)?', 'tog(?:et)?', '\\p{L}*skinne\\p{L}*', 'farvel',
  'håpløs\\p{L}*', 'meningsløs\\p{L}*', 'others', 'live', 'living', 'injur\\w*', 'control', 'impuls\\w*', 'crisis', 'admission', 'safe\\w*', 'protective', 'pills?', 'tablets?',
  'medication', 'bridge', 'train', 'goodbye', 'farewell', 'hopeless\\w*', 'pointless',
]);
/** A threat to end a tenancy, a job or a benefit is not a threat of harm: «Utleier har truet med å si opp kontrakten.» */
const THREAT_TO_ACT =
  /(?:threat\w*|truer|truet|trussel\p{L}*|trusler)\s+(?:med\s+)?(?:to\s+|å\s+|om\s+)(?:terminate|evict|end|cut|stop|withdraw|sack|fire|dismiss|report|si\s+opp|kaste\s+ut|anmelde|avslutte|stanse|kutte|melde|oppsigelse|utkastelse)/giu;
/** Under risk, a clause that only tells of everyday symptoms is about something else; psychosis, agitation or anger is not. */
const EVERYDAY_SYMPTOM =
  /(?<!\p{L})(?:søvn\p{L}*|innsovning\p{L}*|sove\p{L}*|sover|konsentrasjon\p{L}*|hukommelse\p{L}*|energi(?!drikk)\p{L}*|appetitt\p{L}*|panikk\p{L}*|\p{L}*angst\p{L}*|nedstemt\p{L}*|trist\p{L}*|gråt\p{L}*|slit(?:en|ne)|utmattet|hodepine|kvalme|affekt\p{L}*|psykomotor\p{L}*|blikkontakt|mareritt|ryggsmert\p{L}*|smert\p{L}*|somatisk\p{L}*|sleep\w*|insomnia|concentrat\w*|memory|energy|appetite|panic\w*|anxi\w*|low\s+mood|tearful|tired\w*|fatigue|headaches?|nausea|affect|psychomotor|eye\s+contact|speech|nightmares?|pain|somatic|grey|gray|colou?r|farge\p{L}*|glede|anhedoni\p{L}*|joy)(?!\p{L})/iu;
/** In a panic attack or chest pain, «dø» and «dying» tell of the attack: «Panikkanfall der hun var sikker på at hun skulle dø.» */
const PANIC = /(?<!\p{L})(?:panikk\p{L}*|panic\w*|\p{L}*anfall\p{L}*|brystsmert\p{L}*|chest\s+pain|hjerte\p{L}*|heart|cardiac|cardiolog\w*|kardiolog\p{L}*)(?!\p{L})/iu;
const DEATH = /(?<!\p{L})(?:dø|død|døden|die|dying|death)(?!\p{L})/giu;
/** Under risk, a clause about daily activities is about function: «Unngår butikker og buss.», «Spends most days on the sofa.» */
const DAILY_ACTIVITY =
  /(?<!\p{L})(?:sofa\p{L}*|butikk\p{L}*|kjøpesenter\p{L}*|handle|handler|buss\p{L}*|husarbeid\p{L}*|dusj\p{L}*|matlaging|går\s+(?:ikke\s+|sjelden\s+|lite\s+)?ut|kor\p{L}*|shop\w*|shower\w*|housework|chores|cooking|going\s+out|go(?:es)?\s+out|in\s+bed|sofa)(?!\p{L})/iu;
const RISKY_SYMPTOM =
  /(?<!\p{L})(?:paranoi\p{L}*|psykot\p{L}*|psychot\w*|hallusin\p{L}*|hallucinat\w*|stemmer|voices|vrangforestill\p{L}*|delusion\w*|mani\p{L}*|manic|agitat\w*|impuls\p{L}*|uforutsigbar\p{L}*|unpredictable|rage|raseri|sinne|anger|angry)(?!\p{L})/iu;
/** «Risiko», «risk», «fare» on their own, which say nothing of what is at risk. */
const GENERIC_RISK = /(?<!\p{L})(?:\p{L}*risiko\p{L}*|risiker\p{L}*|risikabel\p{L}*|risks?|risky|fare|farer|danger|dangers)(?!\p{L})/giu;

/** Under risk: «risiko for å miste jobben», «at risk of eviction», «his job is on the line». */
const RISK_OF = new RegExp(
  [
    '(?<!\\p{L})(?:\\p{L}*risiko\\p{L}*|fare\\p{L}*|risks?|danger)\\s+(?:\\p{L}+\\s+){0,3}?(?:for|of|that|om|at|er\\s+at)(?!\\p{L})(?!\\s+(?:(?:hennes|hans|eget|egen|sitt|sin|andres|her|his|own|their|others\\W?)\\s+)?(?:(?:eller|og|or|and)\\s+(?:hennes|hans|eget|egen|sitt|sin|andres|her|his|own|their|others\\W?)\\s+)?(?:liv\\p{L}*|lives|life|helse|health|andre|andres|others|seg\\s+selv|themselves|herself|himself|self)(?!\\p{L}))|(?<!\\p{L})risiker\\p{L}*\\s+(?:å\\s+)?(?:miste|å)(?!\\p{L})',
    // «Risk to his registration», but not «risk to self», «risk to others», «risk to the children».
    '(?<!\\p{L})(?:risks?|danger)\\s+to\\s+(?!(?:(?:her|him|my|them|your)sel(?:f|ves)|self|others|children|child|kids|life|staff|anyone|someone|people|(?:the|her|his|their)\\s+(?:children|child|kids|baby|partner|family|public|life))(?!\\p{L}))',
    '(?<!\\p{L})(?:is|are|er)\\s+(?:on\\s+the\\s+line|i\\s+faresonen|truet)(?!\\p{L})',
  ].join('|'),
  'iu',
);
const SOCIAL = new RegExp(
  [
    'jobb\\p{L}*', 'arbeid\\p{L}*', 'stilling\\p{L}*', 'oppsagt', 'oppsigelse\\p{L}*', 'prøvetid\\p{L}*', 'advarsel\\p{L}*', 'sykefravær\\p{L}*', 'sykmeld\\p{L}*', 'sykemeld\\p{L}*',
    'fravær\\p{L}*', 'nav', 'aap', 'arbeidsavklaring\\p{L}*', 'ufør\\p{L}*', 'trygd\\p{L}*', 'sosialhjelp\\p{L}*', 'stønad\\p{L}*', 'skole\\p{L}*', 'studie\\p{L}*', 'studier',
    'eksamen\\p{L}*', 'lærling\\p{L}*', 'økonomi\\p{L}*', 'gjeld\\p{L}*', 'spillegjeld\\p{L}*', 'inkasso\\p{L}*', 'tvangssalg\\p{L}*', 'husleie\\p{L}*', 'leilighet\\p{L}*', 'bolig\\p{L}*',
    'utkastelse\\p{L}*', 'namsmann\\p{L}*', 'førerkort\\p{L}*', 'lappen', 'lisens\\p{L}*', 'ekteskap\\p{L}*', 'forholdet', 'samlivsbrudd\\p{L}*', 'skilsmisse\\p{L}*', 'separasjon\\p{L}*',
    'jobs?', 'work\\w*(?!\\s+out)', 'employ\\w*', 'dismiss\\w*', 'fired', 'sacked', 'warning', 'sick\\s+leave', 'absen\\w*', 'benefits?', 'allowance',
    'school\\w*', 'college', 'universit\\w*', 'degree', 'exams?', 'apprentice\\w*', 'financ\\w*', 'debts?', 'money', 'rent', 'evict\\w*', 'tenancy', 'landlord', 'bailiffs?', 'shifts?', 'uni',
    'housing', 'licen[cs]e', 'marriage', 'divorce', 'relationship', 'custody', 'career', 'moving\\s+out', 'flytte\\s+ut',
    '(?:will|going\\s+to|threaten\\w*\\s+to)\\s+leave', 'leave\\s+(?:him|her|them|if|unless)', 'går\\s+fra\\s+(?:ham|henne|han)', 'sick\\s+notes?', 'break\\s+up', 'split\\s+up', '(?:vil|skal|truer\\s+med\\s+å)\\s+(?:gå\\s+fra|forlate)\\p{L}*', 'relapse', 'tilbakefall\\p{L}*',
  ]
    .map((w) => `(?<!\\p{L})${w}(?!\\p{L})`)
    .join('|'),
  'iu',
);

/** A value that is itself a finding: a level or a denial («Lav.», «Neg.», «Ingen.», «Denies.»). */
const FINDING_VALUE =
  /^(?:lav|moderat|middels|høy|akutt|kronisk|økt|forhøyet|neg(?:ativ)?|nei|ingen(?:\s+kjente?)?|benekter|avkrefter|low|moderate|medium|high|acute|chronic|elevated|increased|negative|neg|no|none(?:\s+known)?|nil|denies|denied)[\s.!]*$/iu;

type ClauseKind = 'none' | 'not' | 'off' | 'signal' | 'plain';

/**
 * What one clause of a section with one criterion does: nothing, says it was not assessed, is about something else, or states
 * something. A placeholder with words in it («Ikke vurdert.», «Not sure.») says that it was not assessed; one without («-», «?»)
 * says nothing (r7F-01).
 */
function clauseKind(section: SectionId, clause: string): ClauseKind {
  const value = clause.replace(LABEL, '').trim();
  if (!/[\p{L}\d]/u.test(value) || TOPIC_ONLY.test(value) || REFERENCE.test(value) || QUESTION.test(value)) return 'none';
  if (ASKED.test(value)) {
    const answer = value.split(/\s+(?:og|and)\s+/iu).slice(1).join(' og ');
    return answer ? clauseKind(section, answer) : 'none';
  }
  if (PLACEHOLDER.test(value)) return /\p{L}/u.test(value) ? 'not' : 'none';
  if (section === 'risiko' && FINDING_VALUE.test(value)) return 'signal';
  if (section === 'tidligere' && PRIOR_NONE.test(clause)) return 'signal';
  if (notStated(clause, value)) return 'not';
  if (unknown(value)) return section === 'risiko' && PRESUPPOSED.test(clause) ? 'signal' : 'not';
  // «Tidligere behandling»: a plan, a wish or this referral, or treatment of a somatic illness, is not mental health care
  // that was given (r9F-02).
  if (section === 'tidligere') {
    if (NOT_PREVIOUS.test(clause) && !PAST_TREATMENT.test(clause)) return 'not';
    if (SOMATIC_RE.test(clause) && !MENTAL_HEALTH.test(clause)) return 'not';
  }
  let signal: boolean;
  if (section === 'risiko') {
    // A job, money, a home or a symptom is about something else unless a strong safety word is in the same clause;
    // a bare «risk of» unless any safety word is (r6F-01, r7F-01).
    const acts = clause.replace(THREAT_TO_ACT, ' ');
    const plain = PANIC.test(acts) ? acts.replace(DEATH, ' ') : acts;
    const specific = plain.replace(GENERIC_RISK, ' ');
    const strong = SAFETY_STRONG.test(plain) || !!ABBREVIATIONS.risiko?.test(plain) || PATTERNS.risiko.test(specific);
    const weak = SAFETY_WEAK.test(plain);
    const symptom = specific === plain && EVERYDAY_SYMPTOM.test(plain) && !RISKY_SYMPTOM.test(plain);
    if (!strong && (SOCIAL.test(clause) || (!weak && (RISK_OF.test(clause) || symptom || DAILY_ACTIVITY.test(plain))))) return 'off';
    signal = strong || weak || PATTERNS.risiko.test(clause);
  } else {
    signal = PATTERNS[SECTION_CRITERIA[section][0]].test(clause);
  }
  if (signal) return 'signal';
  // In «Funksjonsfall», everyday symptoms alone are about something else.
  if (ASIDE.test(clause) || (section !== 'risiko' && PATIENT_UNSURE.test(clause)) || (section === 'funksjon' && EVERYDAY_SYMPTOM.test(clause))) return 'not';
  // Under «Tidligere behandling», a clause that only names an illness or how severe it is says nothing of treatment (r10F-03).
  return section === 'tidligere' && PATTERNS.alvorlighet.test(clause) && !CARE_VERB.test(clause) ? 'none' : 'plain';
}

/**
 * «Tidligere behandling», «Funksjonsfall» and «Risikovurdering» each look for one criterion, so what the GP writes there
 * is about it (r6F-01). The section counts when a clause names the criterion, or when it states something else and no
 * clause says that the criterion was not assessed, or (under risk) is about something else: «Har ikke kartlagt dette selv.
 * Hun har gått til samtaler ved DPS.» and «Betydelig gjeld, namsmannen er koblet inn.» do not count, «Ikke spurt direkte,
 * men ingen tegn til suicidalitet.» does (r7F-01).
 */
function statesSomething(section: SectionId, text: string): boolean {
  const kinds = clauses(text).map((c) => clauseKind(section, c));
  return kinds.includes('signal') || (kinds.includes('plain') && !kinds.includes('not') && !kinds.includes('off'));
}

/** A clause about a relative or the family's history counts for no severity, duration or treatment: «Søster har angst.» */
const RELATIVE_START =
  '^\\s*(?:(?:hennes|hans|pasientens|her|his|the patient[’\']s)\\s+)?(?:mor|moren|mora|moderen|far|faren|faderen|søster|søsteren|søstera|bror|broren|søsken|søsknene|foreldre|foreldrene|tante|tanten|tanta|onkel|onkelen|' +
    'bestemor|bestemoren|bestemora|bestefar|bestefaren|besteforeldre|besteforeldrene|oldemor|oldefar|fetter|fetteren|kusine|kusinen|kusina|nevø|niese|svigermor|svigermoren|svigerfar|svigerfaren|' +
    'svigerforeldre|svoger|svogeren|svigerinne|svigerinnen|datter|datteren|dattera|sønn|sønnen|ektefelle|ektefellen|ektemann|ektemannen|mannen|kona|kone|samboer|samboeren|kjæreste|kjæresten|' +
    'mother|father|mum|mom|dad|sister|brother|siblings?|parents?|aunt|uncle|grand\\p{L}*|cousin|niece|nephew|\\p{L}+-in-law|in-laws|daughter|son|husband|wife|partner|boyfriend|girlfriend)(?!\\p{L})';
const FAMILY = anyOf(
  RELATIVE_START,
  '(?<!\\p{L})(?:i|in)\\s+(?:the\\s+)?(?:familien|slekten|family)(?!\\p{L})|familiehistori|familieanamnes|hereditet|arvelig|family history|runs in the family',
);

/** A clause that starts with a relative: «Mor har hatt depresjon i mange år.» */
const RELATIVE_FIRST = new RegExp(RELATIVE_START, 'iu');

/** A question about a diagnosis is not a statement of how severe the illness is: «Spørsmål om bipolar lidelse?» */
const QUERY = /^(?:spørsmål\s+om|spm\.?\s+om|query|question\s+of)\b|\?\s*$/iu;

/** A time that is an age, a stay, a marriage, a job, a treatment or an appointment, not how long the symptoms have lasted (r6F-03, r7F-05). */
const OTHER_TIME = anyOf(
  '(?:år|års|uker|ukers|måneder|måneders|dager|dagers|mnd)\\s+gammel|(?<!\\p{L})alder(?!\\p{L})',
  '(?<!\\p{L})(?:sønn|datter|barn|baby|gutt|jente|unge)\\p{L}*\\s+(?:er\\s+|på\\s+)(?:ca\\.?\\s+)?\\d',
  '(?<!\\p{L})(?:bodd|bott|bor|flyttet|flytta|gift|samboer|samboende|jobbet|arbeidet|ansatt|utdannet|kontroll|ny time|time hos|timen|avtale|neste|kommende|planlagt|innlagt|p-piller?|prevensjon\\p{L}*|operert|operasjon\\p{L}*|sykehus\\p{L}*|venteliste\\p{L}*|ventetid\\p{L}*|fastlege\\p{L}*|pasient(?:en)?|brukt|bruker|medisin\\p{L}*|tablett\\p{L}*)(?!\\p{L})',
  '(?<!\\p{L})om\\s+(?:ca\\.?\\s+)?(?:en|ei|et|to|tre|fire|fem|seks|sju|syv|åtte|ni|ti|\\d+|noen|et par)\\s+(?:dag|dager|uke|uker|måned|måneder|mnd|år)(?!\\p{L})',
  '(?<!\\p{L})(?:på|on)\\s+(?:\\p{L}+\\s+)?(?:\\p{L}*ferie\\p{L}*|holidays?|vacation)(?!\\p{L})|(?<!\\p{L})(?:ferie|holiday|vacation)\\s+(?:i|in|på|to)\\s',
  '\\d+[- ](?:years?|months?|weeks?|days?)[- ]old|(?<![a-z])aged?\\s+\\d|(?:is|are|was)\\s+\\d+\\s+(?:years?|months?|weeks?|days?)\\s+old',
  '(?<![a-z])(?:(?:her|his|their)\\s+gp|been\\s+(?:her|his|their)\\s+(?:gp|doctor)|on\\s+the\\s+pill|contracepti\\w*|moved|lived|lives|living|married|worked|works|working|employed|together|review|follow[- ]?up|appointment|booked|scheduled|planned|next|starts?|starting|begins?|beginning|due|admitted|operation|surgery|hospital|waiting|waited|registered|known\\s+to\\s+me|taking|taken|medication|tablets?)(?![a-z])',
);

/** «Varighet ukjent.», «Unknown duration.»: a duration that is not known is not a duration. */
const NO_DURATION =
  /(?<!\p{L})(?:varighet\p{L}*|debut\p{L}*|duration|onset)(?:\s+(?:og|and|or|eller)\s+\p{L}+)?\s+(?:er\s+|is\s+|are\s+)?(?:ukjent|uklar\p{L}*|uavklart|usikker\p{L}*|unknown|unclear|uncertain)|(?<!\p{L})(?:ukjent|uklar\p{L}*|usikker|unknown|unclear|uncertain)\s+(?:varighet|debut|duration|onset)|(?<!\p{L})(?:usikker|uklart?|vet\s+ikke|ukjent)\s+(?:på\s+)?(?:hvor\s+lenge|når\s+(?:det|dette|plagene|symptomene)\s+(?:startet|begynte))|(?<![a-z])(?:unsure|unclear|uncertain|not\s+sure|don['’]?t\s+know|unknown)\s+(?:of\s+|about\s+|as\s+to\s+)?(?:how\s+long|when\s+(?:it|this|the\s+(?:symptoms?|problems?))\s+(?:started|began))/iu;

/** «Alvorlighetsgrad ukjent.», «Usikker på … hvor alvorlig det er.», "How severe this is, you will have to judge.": doubt about severity is not a severity (r10F-03). */
const NO_SEVERITY =
  /(?<!\p{L})(?:alvorlighet\p{L}*|severity)(?:\s+(?:og|and|or|eller)\s+\p{L}+)?\s+(?:er\s+|is\s+|are\s+)?(?:ukjent|uklar\p{L}*|uavklart|usikker\p{L}*|unknown|unclear|uncertain)|(?<!\p{L})(?:ukjent|uklar\p{L}*|usikker|unknown|unclear|uncertain)\s+(?:alvorlighet\p{L}*|severity)|^(?:hvor|how)\s+(?:alvorlig\p{L}*|tungt|ille|severe|serious|bad)(?!\p{L})|(?<!\p{L})(?:usikker|uklart?|vet\s+ikke|ukjent|unsure|unclear|uncertain|not\s+sure|don['’]?t\s+know|unknown)\s+(?:\p{L}+\s+){0,6}?(?:hvor\s+(?:alvorlig\p{L}*|tungt|ille)|how\s+(?:severe|serious|bad))(?!\p{L})/iu;

/** The word reading, clause by clause: «Aktuelt og problemstilling» (severity and duration) and a note. */
function reads(c: CriterionId, text: string): boolean {
  return clauses(text).some((clause) => {
    if (NOT_STATED.test(clause) || NOT_START.test(clause.replace(LABEL, '').trim())) return false;
    if ((c === 'alvorlighet' || c === 'behandling') && FAMILY.test(clause)) return false;
    if (c === 'varighet' && RELATIVE_FIRST.test(clause)) return false;
    if (c === 'alvorlighet' && (QUERY.test(clause) || NO_SEVERITY.test(clause))) return false;
    if (c === 'varighet' && (NO_DURATION.test(clause) || (OTHER_TIME.test(clause) && !PATTERNS.alvorlighet.test(clause)))) return false;
    return PATTERNS[c].test(clause) || !!ABBREVIATIONS[c]?.test(clause);
  });
}

/** What a section of a referral states: its one criterion by what is written, or severity and duration by their words. */
function sectionFinds(section: SectionId, text: string): CriterionId[] {
  const wanted = SECTION_CRITERIA[section];
  if (wanted.length === 1) return statesSomething(section, text) ? wanted : [];
  return wanted.filter((c) => reads(c, text));
}

/** A section's status in the margin: all of its criteria found, some, or none yet. Null when the section has none. */
export function sectionStatus(section: SectionId, text: string): 'mentioned' | 'partlyMentioned' | 'notMentionedYet' | null {
  const wanted = SECTION_CRITERIA[section];
  if (!wanted.length) return null;
  const found = sectionFinds(section, text);
  if (found.length === wanted.length) return 'mentioned';
  return found.length ? 'partlyMentioned' : 'notMentionedYet';
}

/** The criteria a text without sections mentions: a note. */
export function mentionedCriteria(text: string): CriterionId[] {
  return CRITERIA_ORDER.filter((c) => reads(c, text));
}

/**
 * The criteria a referral mentions, each read only in its own section, so the count is the sum of
 * what the margins show (r4F-02).
 */
export function referralCriteria(sections: Partial<Record<SectionId, string>>): CriterionId[] {
  const found = new Set((Object.keys(SECTION_CRITERIA) as SectionId[]).flatMap((sec) => sectionFinds(sec, sections[sec] ?? '')));
  return CRITERIA_ORDER.filter((c) => found.has(c));
}
