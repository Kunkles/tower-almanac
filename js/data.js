/* ================= DATA ================= */

// Zones: crown (top) + rings 1 (top ring) → 5 (bottom ring) = 45 pockets + 5 up top
export const ZONES = [
  {id:'crown', name:'Top Crown', slots:5, sun:'Full — most direct', water:'Dries fastest', nutri:'Standard',
   desc:'The open soil surface up top. Room for ~5 taller, sun-hungry plants. It dries out first, so this is the spot for heat-lovers and drought-tolerant herbs.'},
  {id:'r1', name:'Ring 1 · Upper', slots:9, sun:'High', water:'Dries fast', nutri:'Light',
   desc:'Top ring of pockets. Great light, quick to dry between waterings. Mediterranean herbs and strawberries are happiest here.'},
  {id:'r2', name:'Ring 2 · Upper', slots:9, sun:'High', water:'Moderate–dry', nutri:'Light',
   desc:'Still lots of light with slightly better moisture retention than ring 1. Herbs, strawberries, compact peppers, bush beans.'},
  {id:'r3', name:'Ring 3 · Middle', slots:9, sun:'Moderate', water:'Even', nutri:'Building',
   desc:'The comfortable middle. Even moisture, good light, and the worm-column nutrients start concentrating on their way down — the "plant anything" band.'},
  {id:'r4', name:'Ring 4 · Lower', slots:9, sun:'Some overhang shade', water:'Moist', nutri:'Richest',
   desc:'Moist and nutrient-rich, with light shade from the rings above. Brassicas, celery, mint — and the launch pad for trellised vines.'},
  {id:'r5', name:'Ring 5 · Bottom', slots:9, sun:'Most shaded', water:'Moistest', nutri:'Richest + tea',
   desc:'The bottom row: wettest soil, closest to the tea drawer. Official home of vining tomatoes, cucumbers, and squash — trellis them away from the tower.'},
];

// Seasons in SoCal (zone ~10): cool = Oct–Mar, warm = Apr–Sep, all = year-round
// best/good = zone ids
// form = 3D archetype (leafy|herb|spiky|root|vine|bush|fruit|flower|ball)
// foliage/accent = 3D colors (accent = fruit, bloom, or root shoulder)
export const PLANTS = [
  {id:'tom_bush', name:'Tomato (patio/bush)', season:'warm', best:['crown'], good:['r1'], form:'fruit', foliage:'#4E7A3C', accent:'#D2452B', note:'Determinate/patio types up top; stake lightly.', care:'Full sun, even water. Feed monthly; pinch suckers on semi-determinate types.'},
  {id:'tom_vine', name:'Tomato (vining)', season:'warm', best:['r5','r4'], good:[], form:'vine', foliage:'#4E7A3C', accent:'#D2452B', note:'Indeterminate — bottom rows, trellised away from the tower.', care:'Train onto a trellis or railing so it doesn’t shade neighbors. Deep water; heaviest feeder in the tower.'},
  {id:'pepper', name:'Pepper (bell / chili)', season:'warm', best:['crown','r1'], good:['r2'], form:'fruit', foliage:'#3F6B31', accent:'#C9401A', note:'Loves the hot, bright top.', care:'Let soil dry slightly between waterings. Harvest often to keep it producing.'},
  {id:'cucumber', name:'Cucumber', season:'warm', best:['r5','r4'], good:[], form:'vine', foliage:'#57883F', accent:'#3E6B2A', note:'Vining — bottom rows, trellised out.', care:'Thirsty; the moist bottom rows suit it. Pick young and often.'},
  {id:'zucchini', name:'Zucchini (bush)', season:'warm', best:['r5'], good:['r4'], form:'bush', foliage:'#4A7536', accent:'#3E6B2A', note:'Big plant — give it a bottom corner and room.', care:'One plant is plenty. Watch for powdery mildew in coastal humidity.'},
  {id:'beans', name:'Bush beans', season:'warm', best:['r2','r3'], good:[], form:'bush', foliage:'#5E8A46', accent:'#7FA867', note:'Compact bush varieties only.', care:'Fixes its own nitrogen — an easy, generous producer. Succession-plant every 3 weeks.'},
  {id:'basil', name:'Basil', season:'warm', best:['crown','r1'], good:['r2'], form:'herb', foliage:'#3F7A2E', note:'Sun + warmth = flavor.', care:'Pinch flower spikes to keep leaves coming. Loves July.'},
  {id:'strawberry', name:'Strawberry', season:'all', best:['r1','r2'], good:['r3'], form:'fruit', foliage:'#4E7A3C', accent:'#C7302E', low:true, note:'Classic tower plant — fruit dangles clean out of the pocket.', care:'Everbearing types fruit spring–fall in SoCal. Snip runners.'},
  {id:'lettuce', name:'Lettuce', season:'cool', best:['r3','r4'], good:['r2','r5'], form:'leafy', foliage:'#8FBF5A', note:'Anywhere it fits; lower rows in summer heat.', care:'In warm months tuck it low for shade or it bolts. Cut-and-come-again.'},
  {id:'spinach', name:'Spinach', season:'cool', best:['r3'], good:['r2','r4'], form:'leafy', foliage:'#3D6B2F', note:'Fits anywhere; happiest mid-tower.', care:'A true cool-season crop here — plant Oct–Feb. Swap for chard in summer.'},
  {id:'kale', name:'Kale', season:'all', best:['r3','r4'], good:['r2'], form:'leafy', foliage:'#2F5A3C', note:'Tough, productive, near year-round in SoCal.', care:'Harvest lower leaves, let the crown keep growing. Watch for aphids.'},
  {id:'chard', name:'Swiss chard', season:'all', best:['r3'], good:['r4'], form:'leafy', foliage:'#4E7A3C', accent:'#C05F38', note:'The heat-proof "spinach".', care:'Cut outer stalks; one planting can run 6+ months.'},
  {id:'broccoli', name:'Broccoli', season:'cool', best:['r4','r5'], good:['r3'], form:'ball', foliage:'#4C7050', accent:'#5E8A4E', note:'Lower/middle pockets per the official guide.', care:'Heavy feeder — the nutrient-rich low rows help. After the main head, keep it for side shoots.'},
  {id:'cabbage', name:'Cabbage (mini)', season:'cool', best:['r4','r5'], good:['r3'], form:'ball', foliage:'#6B9457', accent:'#A8C48A', note:'Compact varieties only.', care:'Even moisture prevents splitting. Cool season in SoCal.'},
  {id:'cauliflower', name:'Cauliflower', season:'cool', best:['r4','r5'], good:['r3'], form:'ball', foliage:'#55794A', accent:'#EFE9D8', note:'Lower/middle, cool months.', care:'Fussy about heat — Nov–Feb is the SoCal window.'},
  {id:'kohlrabi', name:'Kohlrabi', season:'cool', best:['r3','r4'], good:['r5'], form:'root', foliage:'#55794A', accent:'#9BAED0', note:'Fast, weird, delicious.', care:'Harvest bulbs at tennis-ball size before they get woody.'},
  {id:'radish', name:'Radish', season:'all', best:['r3'], good:['r4','r5'], form:'root', foliage:'#57883F', accent:'#C7302E', note:'Fastest win in the tower — 25 days.', care:'Great filler for empty pockets between big plantings.'},
  {id:'carrot', name:'Carrot (short)', season:'all', best:['r2','r3'], good:[], form:'spiky', foliage:'#5E8A46', accent:'#D97E2B', note:'Short/round varieties fit the pocket depth.', care:'"Paris Market" or "Little Finger" types. Keep evenly moist while germinating.'},
  {id:'beet', name:'Beet', season:'all', best:['r3'], good:['r4'], form:'root', foliage:'#3D6B2F', accent:'#8E2F4F', note:'Roots + greens, two crops in one pocket.', care:'Thin to one plant per cluster; eat the thinnings.'},
  {id:'greenonion', name:'Green onion', season:'all', best:['r2','r3'], good:['r4'], form:'spiky', foliage:'#57883F', note:'Tuck them in anywhere.', care:'Cut and they regrow. Nearly zero effort.'},
  {id:'celery', name:'Celery', season:'cool', best:['r4','r5'], good:['r3'], form:'spiky', foliage:'#7FA867', tall:true, note:'Wants the moist bottom.', care:'Never let it dry out — the bottom rows do the work for you.'},
  {id:'cilantro', name:'Cilantro', season:'cool', best:['r3'], good:['r2'], form:'herb', foliage:'#57883F', note:'Bolts fast in heat — cool months.', care:'Succession-sow every 3 weeks Oct–Mar. Let one bolt for coriander seed.'},
  {id:'parsley', name:'Parsley', season:'all', best:['r3'], good:['r2','r4'], form:'herb', foliage:'#3F7A2E', note:'Steady year-round performer.', care:'Slow to germinate; buy starts. Harvest outer stems.'},
  {id:'thyme', name:'Thyme', season:'all', best:['r1','r2'], good:['crown'], form:'herb', foliage:'#6E8A5E', small:true, note:'Likes the fast-drying top rows.', care:'Thrives on light neglect. Trim to keep it bushy.'},
  {id:'oregano', name:'Oregano', season:'all', best:['r1','r2'], good:['crown'], form:'herb', foliage:'#5E7A50', small:true, note:'Drought-tolerant upper-row herb.', care:'Cascades nicely from a pocket. Cut back hard in spring.'},
  {id:'rosemary', name:'Rosemary (compact)', season:'all', best:['crown','r1'], good:[], form:'spiky', foliage:'#3A5A44', note:'Dry, sunny top spot.', care:'Water least of anything in the tower. Compact/trailing varieties only.'},
  {id:'chives', name:'Chives', season:'all', best:['r2','r3'], good:['r1'], form:'spiky', foliage:'#4E8A4E', accent:'#B48EC7', note:'Set-and-forget perennial.', care:'Snip with scissors; flowers are edible and bees love them.'},
  {id:'mint', name:'Mint', season:'all', best:['r4','r5'], good:['r3'], form:'herb', foliage:'#4E8F4E', note:'A pocket finally contains it.', care:'Loves the moist bottom rows. The pocket is its jail — keep it there.'},
  {id:'marigold', name:'Marigold', season:'warm', best:['r2','r3'], good:['r1','r4'], form:'flower', foliage:'#4A7536', accent:'#DFA22F', note:'Pest patrol, plant throughout.', care:'Deadhead for continuous bloom. Classic companion for tomatoes.'},
  {id:'nasturtium', name:'Nasturtium', season:'all', best:['r4','r5'], good:['r3'], form:'flower', foliage:'#57883F', accent:'#D2691E', trail:true, note:'Trails beautifully; edible flowers.', care:'Poor-soil lover — don’t pamper it. Aphid trap crop, in a good way.'},
];

export const ZLABEL = {crown:'Top crown', r1:'Ring 1 (upper)', r2:'Ring 2 (upper)', r3:'Ring 3 (middle)', r4:'Ring 4 (lower)', r5:'Ring 5 (bottom)'};
export const ZSHORT = {crown:'TOP', r1:'R1', r2:'R2', r3:'R3', r4:'R4', r5:'R5'};
