/* Übungsbibliothek: die bekanntesten Gym-Übungen mit Primär- und Sekundärmuskeln.
   Wird einmalig ergänzt. Übungen, die es (auch unter einem anderen Namen) schon gibt, werden übersprungen.
   Format: [Name, primär, sekundär, Modus ('bw' | 'assist' | null), weitere Namen zum Abgleich] */
'use strict';

const EXLIB_VERSION = 1;
const EXLIB = [
  // Brust
  ['Bankdrücken (Langhantel)', ['chest'], ['front_delt', 'triceps'], null, ['Bankdrücken', 'Bench Press', 'Flachbankdrücken']],
  ['Bankdrücken (Kurzhantel)', ['chest'], ['front_delt', 'triceps'], null, ['Kurzhantel-Bankdrücken', 'Dumbbell Bench Press']],
  ['Schrägbankdrücken (Langhantel)', ['chest'], ['front_delt', 'triceps'], null, ['Schrägbankdrücken', 'Incline Bench Press']],
  ['Schrägbankdrücken (Kurzhantel)', ['chest'], ['front_delt', 'triceps'], null, ['Kurzhantel-Schrägbankdrücken', 'Incline Dumbbell Press']],
  ['Bankdrücken (Smith Machine)', ['chest'], ['front_delt', 'triceps'], null, ['Smith Machine Bench Press']],
  ['Negativbankdrücken (Langhantel)', ['chest'], ['triceps', 'front_delt'], null, ['Negativbankdrücken', 'Decline Bench Press']],
  ['Brustpresse (Maschine)', ['chest'], ['front_delt', 'triceps'], null, ['Brustpresse', 'Chest Press']],
  ['Schräge Brustpresse (Maschine)', ['chest'], ['front_delt', 'triceps'], null, ['Incline Chest Press']],
  ['Cable Crossover (Kabel-Flys)', ['chest'], ['front_delt'], null, ['Cable Crossover', 'Kabel-Flys', 'Kabelzug-Flys', 'Cable Flys']],
  ['Kabel-Flys (von unten nach oben)', ['chest'], ['front_delt'], null, ['Low to High Cable Fly']],
  ['Kurzhantel-Flys', ['chest'], ['front_delt'], null, ['Fliegende', 'Dumbbell Flys', 'Flys (Kurzhantel)']],
  ['Liegestütze', ['chest'], ['front_delt', 'triceps'], 'bw', ['Push-ups', 'Liegestütz']],
  ['Dips mit Unterstützung', ['chest', 'triceps'], ['front_delt'], 'assist', ['Assisted Dips', 'Dips (Maschine, unterstützt)']],
  ['Kurzhantel-Pullover', ['lats', 'chest'], ['triceps'], null, ['Pullover', 'Dumbbell Pullover']],
  ['Landmine Press', ['front_delt', 'chest'], ['triceps', 'abs'], null, []],

  // Rücken
  ['Chin-ups (Untergriff)', ['lats', 'biceps'], ['upper_back', 'forearms'], 'bw', ['Chin-ups', 'Klimmzüge Untergriff']],
  ['Latzug (breit)', ['lats'], ['upper_back', 'biceps', 'forearms'], null, ['Latzug', 'Lat Pulldown', 'Latziehen', 'Breiter Latzug']],
  ['Latzug (Untergriff)', ['lats'], ['biceps', 'upper_back'], null, ['Reverse Grip Lat Pulldown']],
  ['Latzug einarmig (Kabel)', ['lats'], ['biceps'], null, ['Single Arm Lat Pulldown', 'Einarmiger Latzug']],
  ['Langhantelrudern', ['upper_back', 'lats'], ['rear_delt', 'biceps', 'lower_back', 'forearms'], null, ['Rudern (Langhantel)', 'Barbell Row', 'Vorgebeugtes Rudern']],
  ['Kurzhantelrudern (einarmig)', ['lats', 'upper_back'], ['rear_delt', 'biceps', 'forearms'], null, ['Kurzhantelrudern', 'Einarmiges Rudern', 'Dumbbell Row']],
  ['T-Bar-Rudern', ['upper_back', 'lats'], ['rear_delt', 'biceps', 'lower_back'], null, ['T-Bar Row', 'T-Bar Rudern']],
  ['Pendlay-Rudern', ['upper_back', 'lats'], ['rear_delt', 'lower_back', 'biceps'], null, ['Pendlay Row']],
  ['Brustgestütztes Rudern (Kurzhantel)', ['upper_back', 'lats'], ['rear_delt', 'biceps'], null, ['Chest Supported Row', 'Seal Row']],
  ['Iso-Lateral Rudern (Maschine)', ['lats', 'upper_back'], ['biceps', 'rear_delt'], null, ['Iso Lateral Row', 'Hammer Strength Rudern']],
  ['Kabelrudern (breit)', ['upper_back', 'rear_delt'], ['lats', 'biceps'], null, ['Breites Kabelrudern', 'Wide Cable Row']],
  ['Kabelrudern einarmig', ['lats', 'upper_back'], ['biceps', 'rear_delt'], null, ['Einarmiges Kabelrudern', 'Single Arm Cable Row']],
  ['Rudern an der Maschine (eng)', ['lats', 'upper_back'], ['biceps', 'rear_delt'], null, ['Enges Rudern (Maschine)', 'Seated Row Machine']],
  ['Kreuzheben (Langhantel)', ['hamstrings', 'glutes', 'lower_back'], ['quads', 'upper_back', 'forearms', 'adductors'], null, ['Kreuzheben', 'Deadlift', 'Deadlifts']],
  ['Rumänisches Kreuzheben (Langhantel)', ['hamstrings', 'glutes'], ['lower_back', 'forearms', 'adductors'], null, ['Romanian Deadlifts (Langhantel)', 'RDL (Langhantel)', 'Rumänisches Kreuzheben']],
  ['Sumo-Kreuzheben', ['glutes', 'quads', 'adductors'], ['hamstrings', 'lower_back', 'upper_back', 'forearms'], null, ['Sumo Deadlift']],
  ['Rack Pulls', ['upper_back', 'lower_back'], ['glutes', 'hamstrings', 'forearms'], null, ['Rack Pull']],
  ['Shrugs (Kurzhantel)', ['upper_back'], ['forearms'], null, ['Shrugs', 'Schulterheben', 'Kurzhantel-Shrugs']],
  ['Shrugs (Langhantel)', ['upper_back'], ['forearms'], null, ['Langhantel-Shrugs']],
  ['Face Pulls', ['rear_delt'], ['upper_back', 'side_delt'], null, ['Face Pull', 'Facepulls']],
  ['Reverse Flys (Kurzhantel, vorgebeugt)', ['rear_delt'], ['upper_back'], null, ['Vorgebeugtes Seitheben', 'Reverse Flys (Kurzhantel)']],
  ['Reverse Flys (Kabel)', ['rear_delt'], ['upper_back'], null, ['Kabel Reverse Flys', 'Cable Reverse Fly']],
  ['Hyperextensions (Rückenstrecker)', ['lower_back'], ['glutes', 'hamstrings'], 'bw', ['Hyperextensions', 'Rückenstrecker', 'Back Extensions']],
  ['Rudern am Körper (Inverted Rows)', ['upper_back', 'lats'], ['biceps', 'rear_delt'], 'bw', ['Inverted Rows', 'Australische Klimmzüge']],
  ['Klimmzüge (schulterbreit)', ['lats'], ['upper_back', 'biceps', 'forearms'], 'bw', ['Klimmzüge', 'Pull-ups', 'Klimmzug']],

  // Schultern
  ['Military Press (Langhantel, stehend)', ['front_delt'], ['side_delt', 'triceps', 'upper_back'], null, ['Military Press', 'Overhead Press', 'Schulterdrücken (Langhantel)']],
  ['Schulterdrücken (Kurzhantel, sitzend)', ['front_delt'], ['side_delt', 'triceps'], null, ['Schulterdrücken', 'Kurzhantel-Schulterdrücken', 'Dumbbell Shoulder Press']],
  ['Arnold Press', ['front_delt'], ['side_delt', 'triceps'], null, ['Arnold Presse']],
  ['Schulterdrücken (Smith Machine)', ['front_delt'], ['side_delt', 'triceps'], null, ['Smith Machine Shoulder Press']],
  ['Seitheben (Kurzhantel)', ['side_delt'], [], null, ['Seitheben', 'Lateral Raises', 'Kurzhantel-Seitheben']],
  ['Seitheben (Kabel, hinter dem Körper)', ['side_delt'], [], null, ['Behind the Back Cable Lateral Raise']],
  ['Frontheben (Kurzhantel)', ['front_delt'], ['chest'], null, ['Frontheben', 'Front Raises']],
  ['Frontheben (Kabel)', ['front_delt'], ['chest'], null, ['Cable Front Raise']],
  ['Aufrechtes Rudern', ['side_delt', 'upper_back'], ['front_delt', 'biceps'], null, ['Upright Row', 'Aufrechtes Rudern (Kabel)', 'Aufrechtes Rudern (SZ-Stange)']],

  // Bizeps & Unterarme
  ['Bizepscurls (Langhantel)', ['biceps'], ['forearms'], null, ['Langhantelcurls', 'Barbell Curl']],
  ['SZ-Curls', ['biceps'], ['forearms'], null, ['SZ Curls', 'EZ Bar Curl', 'SZ-Stangen-Curls']],
  ['Bizepscurls (Kurzhantel)', ['biceps'], ['forearms'], null, ['Bizepscurls', 'Kurzhantelcurls', 'Dumbbell Curl', 'Curls']],
  ['Hammer Curls (Kurzhantel)', ['biceps', 'forearms'], [], null, ['Hammercurls', 'Hammer Curls']],
  ['Schrägbank-Curls (Kurzhantel)', ['biceps'], ['forearms'], null, ['Incline Curls', 'Schrägbankcurls']],
  ['Konzentrationscurls', ['biceps'], [], null, ['Concentration Curl']],
  ['Kabelcurls', ['biceps'], ['forearms'], null, ['Cable Curls', 'Bizepscurls (Kabel)']],
  ['Bayesian Curls (Kabel)', ['biceps'], [], null, ['Bayesian Curls', 'Bayesian Curl']],
  ['Preacher Curls (SZ-Stange)', ['biceps'], ['forearms'], null, ['Preacher Curls', 'Scott-Curls', 'Larry Scott Curls']],
  ['Spider Curls', ['biceps'], [], null, ['Spider Curl']],
  ['Reverse Curls (SZ-Stange)', ['forearms', 'biceps'], [], null, ['Reverse Curls', 'Obergriff-Curls']],
  ['Handgelenkcurls', ['forearms'], [], null, ['Wrist Curls', 'Unterarmcurls']],
  ["Farmer's Walk", ['forearms', 'upper_back'], ['abs'], null, ['Farmers Walk', 'Farmer Walk', 'Bauernlauf']],

  // Trizeps
  ['Trizeps-Pushdowns (Stange)', ['triceps'], [], null, ['Trizepsdrücken (Stange)', 'Pushdowns Stange', 'Triceps Pushdown']],
  ['Überkopf-Trizepsdrücken (Kabel)', ['triceps'], [], null, ['Overhead Triceps Extension', 'Überkopf Trizeps (Seil)', 'Overhead Extensions']],
  ['Überkopf-Trizepsdrücken (Kurzhantel)', ['triceps'], [], null, ['Kurzhantel Überkopf Trizeps']],
  ['French Press (SZ-Stange)', ['triceps'], [], null, ['French Press', 'Stirndrücken', 'Skullcrushers', 'Skull Crushers']],
  ['Enges Bankdrücken', ['triceps', 'chest'], ['front_delt'], null, ['Close Grip Bench Press', 'Enges Bankdrücken (Langhantel)']],
  ['Bankdips', ['triceps'], ['chest', 'front_delt'], 'bw', ['Bench Dips', 'Dips an der Bank']],
  ['Trizeps-Kickbacks', ['triceps'], [], null, ['Kickbacks', 'Triceps Kickbacks']],
  ['Trizepsmaschine', ['triceps'], ['chest', 'front_delt'], null, ['Dip-Maschine', 'Triceps Machine', 'Trizeps-Maschine']],
  ['Trizepsdrücken einarmig (Kabel)', ['triceps'], [], null, ['Einarmige Pushdowns', 'Single Arm Pushdown']],

  // Beine & Gesäß
  ['Kniebeugen (Langhantel)', ['quads', 'glutes'], ['adductors', 'lower_back', 'hamstrings'], null, ['Kniebeugen', 'Squats', 'Back Squat', 'Kniebeuge']],
  ['Frontkniebeugen', ['quads'], ['glutes', 'adductors', 'upper_back', 'abs'], null, ['Front Squat', 'Front Squats']],
  ['Kniebeugen (Smith Machine)', ['quads', 'glutes'], ['adductors'], null, ['Smith Machine Squat']],
  ['Beinpresse', ['quads', 'glutes'], ['adductors', 'hamstrings'], null, ['Leg Press', 'Beinpresse (45°)']],
  ['Pendulum Squat', ['quads'], ['glutes', 'adductors'], null, ['Pendel-Kniebeuge']],
  ['Goblet Squats', ['quads', 'glutes'], ['adductors', 'abs'], null, ['Goblet Squat']],
  ['Bulgarian Split Squats', ['quads', 'glutes'], ['adductors', 'hamstrings'], null, ['Bulgarische Kniebeugen', 'Bulgarian Split Squat']],
  ['Ausfallschritte (Kurzhantel)', ['quads', 'glutes'], ['adductors', 'hamstrings'], null, ['Ausfallschritte', 'Lunges', 'Walking Lunges']],
  ['Step-ups (Kurzhantel)', ['quads', 'glutes'], ['hamstrings', 'adductors'], null, ['Step-ups', 'Step Ups', 'Aufsteiger']],
  ['Sissy Squats', ['quads'], [], 'bw', ['Sissy Squat']],
  ['Leg Curl (sitzend, Maschine)', ['hamstrings'], ['calves'], null, ['Seated Leg Curl', 'Beinbeuger sitzend']],
  ['Nordic Hamstring Curls', ['hamstrings'], ['calves'], 'bw', ['Nordic Curls', 'Nordic Hamstring Curl']],
  ['Good Mornings', ['hamstrings', 'lower_back'], ['glutes'], null, ['Good Morning']],
  ['Hip Thrusts (Langhantel)', ['glutes'], ['hamstrings', 'adductors'], null, ['Hip Thrusts', 'Hip Thrust', 'Hüftstoßen']],
  ['Hip-Thrust-Maschine', ['glutes'], ['hamstrings'], null, ['Hip Thrust Maschine', 'Glute Drive']],
  ['Glute Bridge', ['glutes'], ['hamstrings'], 'bw', ['Glute Bridges', 'Beckenheben']],
  ['Abduktorenmaschine', ['glutes'], [], null, ['Abduktoren', 'Hip Abduction', 'Abduktor-Maschine']],
  ['Kabel-Kickbacks (Gesäß)', ['glutes'], ['hamstrings'], null, ['Glute Kickbacks', 'Cable Kickbacks']],
  ['Kettlebell Swings', ['glutes', 'hamstrings'], ['lower_back', 'abs', 'forearms'], null, ['Kettlebell Swing', 'KB Swings']],
  ['Wadenheben (stehend, Maschine)', ['calves'], [], null, ['Wadenheben stehend', 'Standing Calf Raise', 'Wadenheben']],
  ['Wadenheben an der Beinpresse', ['calves'], [], null, ['Calf Press', 'Wadendrücken Beinpresse']],

  // Bauch
  ['Crunches', ['abs'], [], 'bw', ['Crunch', 'Bauchpressen']],
  ['Hängendes Beinheben', ['abs'], ['forearms'], 'bw', ['Hanging Leg Raises', 'Beinheben hängend']],
  ['Knieheben am Dip-Barren', ['abs'], [], 'bw', ["Captain's Chair", 'Knee Raises', 'Knieheben']],
  ['Plank (Sekunden als Wdh)', ['abs'], [], 'bw', ['Plank', 'Unterarmstütz', 'Planks']],
  ['Seitstütz (Sekunden als Wdh)', ['abs'], [], 'bw', ['Side Plank', 'Seitstütz']],
  ['Russian Twists', ['abs'], [], 'bw', ['Russian Twist']],
  ['Ab-Roller', ['abs'], ['lats'], 'bw', ['Ab Wheel', 'Bauchroller', 'Ab Rollouts']],
  ['Bauchmaschine (Crunch)', ['abs'], [], null, ['Crunch-Maschine', 'Ab Crunch Machine', 'Bauchmaschine']],
  ['Woodchopper (Kabel)', ['abs'], [], null, ['Woodchopper', 'Holzhacker']],
  ['Dead Bug', ['abs'], [], 'bw', ['Dead Bugs']],
];

/* Vergleichsschlüssel: klein, Umlaute aufgelöst, nur Buchstaben und Ziffern */
function exKey(name) {
  return String(name || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/* Ergänzt fehlende Bibliotheksübungen. Gibt die Anzahl neuer Übungen zurück. */
function addExerciseLibrary(state) {
  const st = state.settings || (state.settings = {});
  if ((st.exLibVersion || 0) >= EXLIB_VERSION) return 0;
  const have = new Set();
  Object.values(state.exercises || {}).forEach(e => have.add(exKey(e.name)));
  let added = 0;
  EXLIB.forEach(([name, primary, secondary, mode, aliases], i) => {
    const keys = [name, ...(aliases || [])].map(exKey);
    if (keys.some(k => have.has(k))) return; // gibt es schon, auch unter anderem Namen
    const id = 'lb' + String(i + 1).padStart(3, '0');
    if (state.exercises[id]) return;
    state.exercises[id] = { id, name, primary: primary.slice(), secondary: secondary.slice(), mode: mode || null };
    keys.forEach(k => have.add(k));
    added++;
  });
  st.exLibVersion = EXLIB_VERSION;
  return added;
}
