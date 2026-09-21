import type { HarvardCaseData, HarvardMedia } from '../harvardCaseTypes';

const asset = (id: string, sourceNode: string, image: string, width: number, height: number, alt: string): HarvardMedia => ({
  id, sourceNode, image, width, height, alt,
});

const cover = asset('orbit-cover', '159:3799', '/v2-3/cases/orbit/cover-hero.png', 2448, 1584, 'Orbit necklace camera concept');
const mark = asset('orbit-mark', '159:3802', '/v2-3/cases/orbit/orbit-mark.svg', 58, 73, 'Orbit mark');
const competitiveMap = asset('competitive-map', '200:10581', '/v2-3/cases/orbit/competitive-map-hd.png', 1176, 1176, 'Competitive analysis map');
const frequency = asset('misplacement-frequency', '200:10649', '/v2-3/cases/orbit/misplacement-frequency-hd.png', 608, 488, 'How often people misplace items at home');
const personaRina = asset('persona-rina-portrait', '200:10666', '/v2-3/cases/orbit/persona-rina-portrait.png', 784, 620, 'Portrait of Rina');
const personaDerek = asset('persona-derek-portrait', '200:10678', '/v2-3/cases/orbit/persona-derek-portrait.png', 784, 620, 'Portrait of Derek');
const personaFiona = asset('persona-fiona-portrait', '200:10692', '/v2-3/cases/orbit/persona-fiona-portrait.png', 784, 784, 'Portrait of Fiona');
const hardwareBreakdown = asset('hardware-breakdown', '159:3921', '/v2-3/cases/orbit/hardware-breakdown-hd.png', 1732, 974, 'Orbit hardware breakdown');
const architecture = asset('hardware-architecture', '159:3965', '/v2-3/cases/orbit/hardware-architecture-hd.png', 1344, 493, 'Orbit hardware architecture');
const productContext = asset('ui-product-context', '159:4079', '/v2-3/cases/orbit/ui-product-context-crop.png', 950, 630, 'Hand holding Orbit’s three-dimensional map interface');

export const orbitCase: HarvardCaseData = {
  slug: 'orbit', title: 'Orbit',
  subtitle: 'A vision-based AI necklace that passively logs where household items are placed, enabling seamless memory retrieval through spatial intelligence.',
  period: 'Aug. 2025 — Oct. 2025', kind: 'Personal Project · Project 03',
  tags: ['Physical AI', 'Expericence Prototyping', 'Memory Augmentation', 'Wearable Design'], mark, hero: cover, coverFrame: '159:3798',
  chapters: [
    {
      id: 'research', sourceFrame: '200:10573', title: 'Research', sections: [
        {
          id: 'pain-point', title: 'Pain Point', layout: 'cards', sourceNodes: ['200:10577', '200:10578', '200:10579', '200:10580'],
          items: [
            { title: 'Spatial Disorganization', body: ['Items are stored randomly without a clear system, making them harder to locate later.'], sourceNodes: ['I200:10577;572:5822', 'I200:10577;572:5821'] },
            { title: 'Cognitive Overload', body: ['People often forget where they placed items, especially when similar objects create visual confusion.'], sourceNodes: ['I200:10578;572:5822', 'I200:10578;572:5821'] },
            { title: 'Manual Burden', body: ['Some existing apps require users to manually record where they place items and what is the items.'], sourceNodes: ['I200:10579;572:5822', 'I200:10579;572:5821'] },
            { title: 'Shared Space Conflicts', body: ['In multi-user households, different people place or move items without others knowing.'], sourceNodes: ['I200:10580;572:5822', 'I200:10580;572:5821'] },
          ],
        },
        {
          id: 'existing-solutions', title: 'Existing Solutions', layout: 'cards', sourceNodes: ['I200:10696;659:2461', '200:10627', '200:10628', '200:10629', '200:10630', '200:10631', '200:10632', '200:10633', '200:10634'],
          items: [
            { title: 'Apple AirTag', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-airtag', '200:10627', '/v2-3/cases/orbit/solution-airtag.png', 1000, 850, 'Apple AirTag attached to keys'), sourceNodes: ['I200:10627;572:5750', 'I200:10627;572:5748'] },
            { title: 'MemPal', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-mempal', '200:10628', '/v2-3/cases/orbit/solution-mempal.jpeg', 720, 405, 'MemPal product photograph'), sourceNodes: ['I200:10628;572:5750', 'I200:10628;572:5748'] },
            { title: 'Limitless Pendant', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-limitless', '200:10629', '/v2-3/cases/orbit/solution-limitless.png', 2316, 1920, 'Limitless Pendant product photograph'), sourceNodes: ['I200:10629;572:5750', 'I200:10629;572:5748'] },
            { title: 'Microsoft SenseCam', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-sensecam', '200:10630', '/v2-3/cases/orbit/solution-sensecam.jpeg', 769, 576, 'Microsoft SenseCam product photograph'), sourceNodes: ['I200:10630;572:5750', 'I200:10630;572:5748'] },
            { title: 'Amazon Echo Look', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-echo-look', '200:10631', '/v2-3/cases/orbit/solution-echo-look.png', 768, 576, 'Amazon Echo Look product photograph'), sourceNodes: ['I200:10631;572:5750', 'I200:10631;572:5748'] },
            { title: 'Go-Finder', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-go-finder', '200:10632', '/v2-3/cases/orbit/solution-go-finder.png', 2720, 1540, 'Go-Finder product photograph'), sourceNodes: ['I200:10632;572:5750', 'I200:10632;572:5748'] },
            { title: 'HippoCam', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-hippocam', '200:10633', '/v2-3/cases/orbit/solution-hippocam.png', 2066, 1416, 'HippoCam product photograph'), sourceNodes: ['I200:10633;572:5750', 'I200:10633;572:5748'] },
            { title: 'Meta Ray-Ban Display', body: ['Tracks lost items using Ultra Wideband to locate and use Find My map to show on phone.'], media: asset('solution-ray-ban', '200:10634', '/v2-3/cases/orbit/solution-ray-ban.png', 1936, 1046, 'Meta Ray-Ban Display product photograph'), sourceNodes: ['I200:10634;572:5750', 'I200:10634;572:5748'] },
          ],
        },
        { id: 'competitive-analysis', title: 'Competitive Analysis', layout: 'split', media: [competitiveMap], sourceNodes: ['200:10581'] },
        { id: 'conclusion', title: 'Conclusion', layout: 'wide', body: ['There are many product on the market and in developing trying to solve the same pain point. However, neither of them are not able to solve the problem in all circumstances or is in prototyping stage.'], sourceNodes: ['200:10699', '200:10700'] },
        {
          id: 'misplacement-frequency', title: 'How often do people misplace items at home?', layout: 'split', media: [frequency],
          table: { caption: 'Misplacement frequency', columns: ['Frequency', 'Share'], rows: [['Never', '13.3%'], ['Once a week', '26.7%'], ['Twice a week', '23.3%'], ['Thrice a week', '10.0%'], ['Everyday', '26.7%']] },
          sourceNodes: ['200:10649', '200:10638', '200:10639', '200:10640', '200:10641', '200:10642', '200:10650', '200:10651', '200:10652', '200:10653', '200:10654', '200:10662'],
        },
        {
          id: 'potential-users', title: 'Potential User', layout: 'grid', sourceNodes: ['200:10666', '200:10678', '200:10692'],
          items: [
            { title: 'Rina - 25', body: ['New York City - Consultunt', 'Current Method: AirTag', '“I always put things back after use to avoid losing them. However, this method often don’t work since I can’t make sure that my home is perfectly organized and unchangeable.”'], media: personaRina, sourceNodes: ['200:10675', '200:10676', '200:10673', '200:10672'] },
            { title: 'Derek - Age 35', body: ['Boston - Artist', 'Current Method: Memory', '“I misplace stuff at home pretty often—keys, wallet, headphones. Sometimes I talk to myself like, “top drawer, remember that,” but when I’m distracted, it just slips my mind.”'], media: personaDerek, sourceNodes: ['200:10689', '200:10690', '200:10687', '200:10686'] },
            { title: 'Fiona - 23', body: ['Los Angeles - Model', 'Current Method: Camera Roll', '“For those small items I can only try to take a picture. I recalls last using the item when I can’t find it, assumes where it was placed, then retraces locations to infer where it was lost. “'], media: personaFiona, sourceNodes: ['200:10706', '200:10707', '200:10709', '200:10710'] },
          ],
        },
        { id: 'design-problem', title: 'Design Problem', layout: 'wide', body: ['How might we enable a person\'s environment (their home, car key, or bag) to be aware of their essential items and proactively assist when something is misplaced?'], sourceNodes: ['200:10664', '200:10665'] },
      ],
    },
    {
      id: 'ideation', sourceFrame: '159:3829', title: 'Ideation', sections: [
        { id: 'requirement', title: 'Requirement / Need', layout: 'wide', body: ['An device can help them memory where they have placed there item in home especially when they are not aware of.'], sourceNodes: ['159:3843', '159:3844'] },
        { id: 'problem-definition', title: 'Problem Definition', layout: 'wide', body: ['Wearable Device Ideation Funnel', 'In modern daily life, individuals frequently misplace essential personal items such as keys, access cards, or digital identification devices. These losses, while often minor, can result in significant inconvenience, stress, and even security risks.'], sourceNodes: ['I159:3918;659:2461', '159:3845', '159:3846'] },
        {
          id: 'brainstorm', title: 'Brainstorm', layout: 'cards', sourceNodes: ['159:3835', '159:3837', '159:3838', '159:3839', '159:3840', '159:3841'],
          items: [
            { body: ['Utilizing gravity and the principle of a roly-poly (self-righting) structure to ensure that the camera consistently maintains a fixed orientation.'], media: asset('brainstorm-1', '159:3837', '/v2-3/cases/orbit/brainstorm-1.png', 1024, 1024, 'Self-righting Orbit concept illustration'), sourceNodes: ['I159:3837;764:2432'] },
            { body: ['One side of the device is flat, while the other is curved, allowing the lens to always face outward—away from the wearer’s body.'], media: asset('brainstorm-2', '159:3838', '/v2-3/cases/orbit/brainstorm-2.png', 1024, 1024, 'Curved Orbit concept illustration'), sourceNodes: ['I159:3838;764:2432'] },
            { body: ['A detachable battery module allows for easy swapping or replacement of battery units.'], media: asset('brainstorm-3', '159:3839', '/v2-3/cases/orbit/brainstorm-3.png', 1024, 1024, 'Detachable battery Orbit concept illustration'), sourceNodes: ['I159:3839;764:2432'] },
            { body: ['The system can generate a 3D model of the home environment, enabling users to precisely locate where objects are placed within the house.'], media: asset('brainstorm-4', '159:3840', '/v2-3/cases/orbit/brainstorm-4.png', 1024, 1024, 'Three-dimensional home map concept illustration'), sourceNodes: ['I159:3840;764:2432'] },
            { body: ['When fingers touch the Orbit, bioelectrical signals from the user’s body activate the recording mode.'], media: asset('brainstorm-5', '159:3841', '/v2-3/cases/orbit/brainstorm-5.png', 2048, 2048, 'Touch-activated Orbit concept illustration'), sourceNodes: ['I159:3841;764:2432'] },
          ],
        },
        {
          id: 'wearable-options', title: 'Exploration of Wearable Options', layout: 'comparison', sourceNodes: ['159:3852', '159:3887', '159:3889', '159:3891', '159:3893', '159:3899', '159:3900', '159:3901', '159:3902', '159:3903'],
          items: [
            { title: 'Smart Watch', body: ['Watches provide constant visibility and can integrate with existing smart features, but they risk aesthetic mismatch and bulkiness.'], sourceNodes: ['159:3887', '159:3900'] },
            { title: 'Smart Ring', body: ['Rings offer minimalism and discretion, yet may lack sufficient space for advanced tracking hardware.'], sourceNodes: ['159:3889', '159:3901'] },
            { title: 'Wristband', body: ['Wristbands allow for stylistic flexibility and moderate visibility but are sometimes perceived as less formal or unsuitable in professional contexts.'], sourceNodes: ['159:3891', '159:3902'] },
            { title: 'Necklace', body: ['Necklaces strike a balance between elegance, cultural acceptance, and functional accessibility, making them an attractive candidate for embedding discreet tracking technology.'], sourceNodes: ['159:3893', '159:3903'] },
          ],
        },
        { id: 'evaluation-criteria', title: 'Evaluation Criteria', layout: 'comparison', media: [asset('wearable-evaluation', '159:3847', '/v2-3/cases/orbit/wearable-evaluation-hd.png', 1562, 872, 'Wearable evaluation graphics and charts')], sourceNodes: ['I159:3852;659:2461', '159:3854', '159:3855', '159:3856', '159:3857', '159:3858', '159:3859', '159:3862', '159:3863', '159:3864', '159:3865', '159:3866', '159:3867', '159:3870', '159:3871', '159:3872', '159:3873', '159:3874', '159:3875', '159:3878', '159:3879', '159:3880', '159:3881', '159:3882', '159:3883'] },
      ],
    },
    {
      id: 'prototype', sourceFrame: '159:3920', title: 'Prototype', sections: [
        { id: 'hardware', title: 'Hardware Breakdown', layout: 'wide', media: [hardwareBreakdown], sourceNodes: ['159:3921'] },
        { id: 'architecture', title: 'Hard Architecture', layout: 'wide', media: [architecture], sourceNodes: ['159:3965'] },
        {
          id: 'potential-user', title: 'Potential User', layout: 'split', sourceNodes: ['159:4013', '159:4041', '159:4053', '159:4058', '159:4060', '159:4063', '159:4065'],
          items: [
            { title: 'Ethan', body: ['Age 28', 'Single 1B1B apartment'], sourceNodes: ['159:4014', '159:4018', '159:4019'] },
            { title: 'Lifestyle', body: ['Loses track of items', 'Memory recall reliability', 'Visual clutter tolerance', 'Manual track acceptance', 'Item switching frequency'], media: asset('ethan-lifestyle-ratings', '159:4041', '/v2-3/cases/orbit/ethan-lifestyle-ratings.png', 1024, 636, 'Ethan lifestyle dot-rating graphic'), sourceNodes: ['159:4045', 'I159:4048;452:3152', 'I159:4049;452:3152', 'I159:4050;452:3152', 'I159:4051;452:3152', 'I159:4052;452:3152'] },
            { title: 'Needs & Opportunity:', body: ['Wants a passive way to track item placement', 'Seeks a solution that fits naturally into his normal life style'], sourceNodes: ['159:4058', '159:4060'] },
            { title: 'Pain Points:', body: ['Frequently loses track of small items like tools or headphones', 'Visual clutter makes it hard to remember where things are', 'Mental recall doesn’t always work'], sourceNodes: ['159:4063', '159:4065'] },
          ],
        },
        {
          id: 'storyboard', title: 'Storyboard', layout: 'steps', sourceNodes: ['159:4066', '159:4024', '159:4029', '159:4074', '159:4034'],
          items: [
            { title: '1', body: ['Scan the home environment at the first use, then orbit will create a 3D home map'], media: asset('storyboard-1', '159:4070', '/v2-3/cases/orbit/storyboard-1-art.png', 768, 512, 'Orbit storyboard drawing: scan the home'), sourceNodes: ['159:4069', 'I159:4072;446:727'] },
            { title: '2', body: ['When user put a Passport in a draw in the study Orbit will remember it'], media: asset('storyboard-2', '159:4027', '/v2-3/cases/orbit/storyboard-2-art.png', 768, 512, 'Orbit storyboard drawing: store a passport'), sourceNodes: ['159:4026', 'I159:4028;446:727'] },
            { title: '3', body: ['Few days later the user cannot find the Passport'], media: asset('storyboard-3', '159:4032', '/v2-3/cases/orbit/storyboard-3-art.png', 768, 512, 'Orbit storyboard drawing: passport misplaced'), sourceNodes: ['159:4031', 'I159:4033;446:727'] },
            { title: '4', body: ['User asks AI where is my Passport'], media: asset('storyboard-4', '159:4077', '/v2-3/cases/orbit/storyboard-4-art.png', 768, 512, 'Orbit storyboard drawing: ask AI'), sourceNodes: ['159:4076', 'I159:4078;446:727'] },
            { title: '5', body: ['User goes to the study and follows the instruction on the 3D map find the Passport'], media: asset('storyboard-5', '159:4039', '/v2-3/cases/orbit/storyboard-5-art.png', 768, 512, 'Orbit storyboard drawing: follow the map'), sourceNodes: ['159:4038', 'I159:4040;446:727'] },
          ],
        },
      ],
    },
    {
      id: 'interface', sourceFrame: '159:4079', title: 'UI Design', sections: [
        {
          id: 'ui-design', title: 'UI Design', layout: 'grid', sourceNodes: ['I159:4119;659:2461', '159:4087', '159:4088', '159:4089', '159:4092', '159:4093', '159:4094'],
          items: [
            { title: 'Interactive Zoom & Navigation', body: ['Zoom In'], media: asset('ui-screen-1', '159:4089', '/v2-3/cases/orbit/ui-screen-3-hd.png', 472, 1024, 'Orbit three-dimensional map zoom screen'), sourceNodes: ['159:4131', '159:4105'] },
            { body: ['Redirect'], media: asset('ui-screen-2', '159:4088', '/v2-3/cases/orbit/ui-screen-2-hd.png', 472, 1024, 'Orbit three-dimensional map redirect screen'), sourceNodes: ['159:4109'] },
            { media: asset('ui-screen-3', '159:4087', '/v2-3/cases/orbit/ui-screen-1-hd.png', 472, 1024, 'Orbit three-dimensional map screen'), sourceNodes: ['159:4087'] },
            { title: 'Seamless Map Transition', body: ['Switch to 2D Map'], media: asset('ui-screen-4', '159:4094', '/v2-3/cases/orbit/ui-screen-6-hd.png', 472, 1024, 'Orbit two-dimensional map screen'), sourceNodes: ['159:4121', '159:4099'] },
            { title: 'Smart Object Search', body: ['Search Items'], media: asset('ui-screen-5', '159:4093', '/v2-3/cases/orbit/ui-screen-5-hd.png', 472, 1024, 'Orbit item search list screen'), sourceNodes: ['159:4126', '159:4101'] },
            { title: 'Context-Aware Object Details', body: ['Orbit Details'], media: asset('ui-screen-6', '159:4092', '/v2-3/cases/orbit/ui-screen-4-hd.png', 472, 1024, 'Orbit device details screen'), sourceNodes: ['159:4136', '159:4103'] },
          ],
        },
        { id: 'future-plan', title: 'Future Plan', layout: 'split', body: ['The next step is to validate Orbit’s AI feasibility. I plan to prototype the core pipeline—object detection, spatial mapping, and lightweight on-device reasoning—to understand what level of automation is technically achievable. Running small field tests will help reveal where the concept holds, where it breaks, and how the system should evolve beyond speculation toward a grounded, testable AI workflow.'], media: [productContext], sourceNodes: ['159:4082', '159:4083', '159:4086', '159:4079'] },
      ],
    },
  ],
};
