import type { HarvardCaseData, HarvardMedia } from '../harvardCaseTypes';

const media = (
  id: string,
  sourceNode: string,
  image: string,
  width: number,
  height: number,
  alt: string,
  caption?: string,
): HarvardMedia => ({ id, sourceNode, image, width, height, alt, caption });

const flowScreens: HarvardMedia[] = [
  media('flow-01-welcome', '159:6832', '/v2-3/cases/deal-points/flow-01-welcome.png', 1124, 730, 'Deal Points welcome screen', 'Choose your role'),
  media('flow-02-cpp', '159:6856', '/v2-3/cases/deal-points/flow-02-cpp.png', 1124, 730, 'Deal Points Cents Per Point lesson', 'Tutorial'),
  media('flow-03-flight-deals', '159:6928', '/v2-3/cases/deal-points/flow-03-flight-deals.png', 843, 548, 'Deal Points international flight deals', 'Explore the deal flight'),
  media('flow-04-flight-deal-detail', '159:6995', '/v2-3/cases/deal-points/flow-04-flight-deal-detail.png', 1124, 730, 'Deal Points flight search controls', 'Search for the deal'),
  media('flow-05-flight-search', '159:7068', '/v2-3/cases/deal-points/flow-05-flight-search.png', 1124, 730, 'Deal Points flight search results', 'Compare CPP'),
  media('flow-06-flight-detail', '159:7098', '/v2-3/cases/deal-points/flow-06-flight-detail.png', 1124, 730, 'Deal Points flight detail', 'Check the flight details'),
  media('flow-07-flight-seat', '159:7122', '/v2-3/cases/deal-points/flow-07-flight-seat.png', 1124, 730, 'Deal Points flight seat screen', 'Check cabin details'),
  media('flow-08-flight-extension', '159:7153', '/v2-3/cases/deal-points/flow-08-flight-extension.png', 1124, 730, 'Deal Points flight extension', 'Teach you how to book'),
  media('flow-09-wallet', '159:7230', '/v2-3/cases/deal-points/flow-09-wallet.png', 1124, 730, 'Deal Points wallet', 'Wallet'),
  media('flow-10-hotel-search', '159:7273', '/v2-3/cases/deal-points/flow-10-hotel-search.png', 843, 548, 'Deal Points hotel search', 'Explore hotel'),
  media('flow-11-hotel-detail', '159:7294', '/v2-3/cases/deal-points/flow-11-hotel-detail.png', 843, 548, 'Deal Points hotel detail', 'Hotel Detail'),
  media('flow-12-price-history', '159:7315', '/v2-3/cases/deal-points/flow-12-price-history.png', 1124, 730, 'Deal Points price history', 'Price History'),
];

export const dealPointsCase: HarvardCaseData = {
  slug: 'deal-points',
  title: 'Deal Points',
  subtitle: 'Financial Literacy',
  period: 'Oct. 2024 — Jun. 2025',
  kind: 'Personal Project',
  tags: ['Financial Literacy', 'Unreal Engine', 'Web Design', 'Tested Prototype'],
  coverFrame: '159:5914',
  mark: media('deal-points-mark', '159:5923', '/v2-3/cases/deal-points/deal-points-mark.svg', 62, 60, 'Deal Points mark'),
  hero: media('cover-visual', '159:5917', '/v2-3/cases/deal-points/cover-visual.png', 2337, 1299, 'Deal Points flight-reward platform on a laptop'),
  chapters: [
    {
      id: 'research',
      sourceFrame: '159:5946',
      title: 'Research Question',
      lead: [
        'Points are a form of cash that isn’t very liquid and is often overlooked. Using them wisely is a part of personal financial literacy.',
        'Many people give up on maximizing their credit card rewards—or stop using credit cards altogether—because the process feels overly complicated and frustrating.',
      ],
      sections: [
        {
          id: 'research-observations',
          title: 'Research Question',
          layout: 'wide',
          body: [
            'Young adults who are just entering the workforce and beginning to become economically independent is lacking of financial literacy.',
            'People around me rarely plan, budget, or use the benefits available to them—especially credit card reward.',
            'why do people miss value that’s right in front of them?',
          ],
          sourceNodes: ['159:5949', '159:5953', '159:5956'],
        },
        {
          id: 'fun-facts',
          title: 'Fun Facts',
          layout: 'split',
          body: [
            '71% Americans have credit cards',
            '41% Americans have travel credit card',
            '“High-FICO consumers profit from reward credit cards because of their higher financial sophistication… Meanwhile, low-FICO consumers lose because they borrow more and pay interest and fees.” -Santana.',
            'Who Pays for Your Rewards?Federal Reserve Board. Redistribution in the Credit Card Market.',
          ],
          sourceNodes: ['159:5957', '159:5967', '159:5968', '159:5974', '159:5975', '159:5959'],
        },
        {
          id: 'reward-system',
          title: 'Investigate credit card system',
          layout: 'cards',
          items: [
            { title: 'Use Card', body: ['Merchant', 'Card Issuer'], sourceNodes: ['159:6016', '159:6028', '159:6039'] },
            { title: 'Cash', body: ['1.5-3%', 'Interchange Fee', '1-10%'], sourceNodes: ['159:6041', '159:6044', '159:6046'] },
            { title: 'Rewards', body: ['Airline Miles', 'Hotel Points', 'Cashback', 'Gift Card'], sourceNodes: ['159:6048', '159:6050', '159:6052', '159:6058', '159:6080', '159:6082'] },
          ],
          media: [media('reward-system-diagram', '159:5946', '/v2-3/cases/deal-points/reward-system-diagram.svg', 1410, 723, 'Credit-card reward system diagram showing money and reward relationships', 'Where is credit card rewards come from?')],
        },
        {
          id: 'interviews',
          title: 'Interviews',
          layout: 'cards',
          items: [
            { title: '3/6 — Hard to manage multiple card point rewards', body: ['“I have Amex, Chase, BoA… but there’s no place that shows everything together. Every time I want to check my spending or points, I’m just jumping between apps and doing the math in my head.”'], sourceNodes: ['159:5988', '159:5990', '159:5991'] },
            { title: '4/6 — Difficult to understand the redemption rules', body: ['“Either I go crazy reading all the rules and calculators to squeeze value out of every point. Most of the time I don’t even want to think about CPP.”'], sourceNodes: ['159:5994', '159:5996', '159:5984'] },
            { title: '4/6 — The real frustration is redeeming, not earning', body: ['“The painful part is when I finally try to book a flight and there’s no award seat, or the dates don’t work... my points keep sitting there doing nothing.”'], sourceNodes: ['159:6000', '159:6002', '159:6003'] },
            { title: '2/6 — Tricky to know how much did I actually saved', body: ['“I honestly have no idea how much I actually saved... Every bank calculates value differently, every app shows something else, and there’s nowhere that gives me a straight answer.”'], sourceNodes: ['159:6007', '159:6009', '159:6010'] },
          ],
        },
        {
          id: 'journey',
          title: 'User Journey Map',
          layout: 'wide',
          body: ['The process of use the points has often been complex and time consuming for users'],
          media: [media('journey-map', '159:6092', '/v2-3/cases/deal-points/journey-map.png', 905, 569, 'User journey map for learning and using point rewards', 'User Journey Map')],
          sourceNodes: ['159:6092', '159:6221'],
        },
        {
          id: 'survey',
          title: 'Survey',
          layout: 'comparison',
          body: ['Among the 35 people I surveyed, over 65.7% have a travel-rewards credit card, and 40% hold more than one card.'],
          items: [
            {
              title: 'Respondent utilize credit cards with rewards points',
              body: ['No — 40%', 'Yes, one card — 34.3%', 'Yes multiple cards — 25.7%'],
              media: media('survey-reward-cards', '159:6235', '/v2-3/cases/deal-points/survey-reward-cards.png', 480, 480, 'Survey: respondent utilization of credit cards with rewards points', 'Respondent utilize credit cards with rewards points'),
              sourceNodes: ['159:6234', '159:6240', '159:6241', '159:6242'],
            },
            {
              title: 'Respondents‘ U.S. credit card number',
              body: ['0 card — 20%', '1 card — 17.1%', '2 cards — 22.9%', '3 or more cards — 40%'],
              media: media('survey-card-count', '159:6257', '/v2-3/cases/deal-points/survey-card-count.png', 480, 480, 'Survey: respondents’ United States credit-card number', 'Respondents‘ U.S. credit card number'),
              sourceNodes: ['159:6256', '159:6264', '159:6265', '159:6266', '159:6267'],
            },
          ],
          sourceNodes: ['159:5970', '159:6234', '159:6240', '159:6241', '159:6242', '159:6256', '159:6264', '159:6265', '159:6266', '159:6267'],
        },
        {
          id: 'persona',
          title: 'Persona',
          layout: 'split',
          body: ['Name: Hana', 'Age: 28', 'Frequent travel with 3–4 credit cards.'],
          items: [
            { title: 'Goals:', body: ['Use points at the highest value', 'Understand when to use cash vs. points', 'Build practical financial literacy', 'Save time on research'], sourceNodes: ['159:6281', '159:6282'] },
            { title: 'Pain Points:', body: ['Points scattered across platforms', 'Doesn’t know real point value (CPP)', 'Afraid of “redeeming wrong”', 'Overwhelmed by rules & charts'], sourceNodes: ['159:6284', '159:6285'] },
          ],
          media: [media('hana-persona', '159:6268', '/v2-3/cases/deal-points/hana-persona.png', 748, 496, 'Hana persona portrait')],
          sourceNodes: ['159:6272', '159:6273', '159:6275', '159:6276', '159:6278'],
        },
      ],
    },
    {
      id: 'concept',
      sourceFrame: '159:6286',
      title: 'Problems & Insights',
      lead: ['Points are a form of cash that isn’t very liquid and is often overlooked. Using them wisely is a part of personal financial literacy.'],
      sections: [
        {
          id: 'problem-insight-hmw',
          title: 'Problem / Insights / How Might We?',
          layout: 'cards',
          items: [
            { title: 'Maximize usage is complicated', body: ['Most users don’t understand how credit card points work, what they’re worth, or how to maximize in using them.', 'The existing information of credit points is fragmented. Hope the learning process is simple, motivated.', 'Make it easy for beginners to understand and start using credit card points?'], sourceNodes: ['159:6291', '159:6292', '159:6293'] },
            { title: 'No Clear Sense of Value', body: ['People don’t know the value of points,” and they have no way to calculate their actual savings or point value.', 'Showing concrete savings cash comparison to points will immediately increases confidence and motivation.', 'Help users clearly see the value they save and know whether a deal is good or bad?'], sourceNodes: ['159:6294', '159:6295', '159:6296'] },
            { title: 'Long Waits Kill Motivation', body: ['Credit card points require user to wait for the right redemption window, people feel uncertain and give up.', 'During the waiting cycle, users don’t know: • Is it the right time to redeem • Redeem price history', 'Help users catch the best time to redeem and keep them using the platform?'], sourceNodes: ['159:6297', '159:6298', '159:6299'] },
          ],
          sourceNodes: ['159:6300', '159:6301', '159:6302'],
        },
        {
          id: 'cpp',
          title: 'Introducing Cents Per Point',
          layout: 'split',
          body: ['Start using the Platform', 'CPP (Cents Pre Point) is a value metric tells you how much each of your points is worth in cents when you use them.', '3000 US Dollar — Needs 50,000 Points — Therefore 6.0', 'In most situation, CPP > 1.0 means you are not losing out value. (Except hotel redemption)', 'CPP > points evaluation means you‘ve profited. (You have beat the designed value)', 'The higher the CPP, the better you are maximizing your points usages!'],
          media: [media('finance-illustration', '159:6287', '/v2-3/cases/deal-points/finance-illustration.png', 1024, 1024, 'Financial literacy illustration')],
          sourceNodes: ['159:6312', '159:6313', '159:6314', '159:6320', '159:6322', '159:6324', '159:6344', '159:6347', '159:6350'],
        },
        {
          id: 'brainstorm',
          title: 'Brainstorm',
          layout: 'steps',
          items: [
            { title: 'Start using the Platform', body: ['Gamified interactive tutorial', 'Cent Per Point mini Lesson', 'Potential Value Preview', 'Demo mode with fake data', 'Making financial literacy learning painless to begin.'], media: media('brainstorm-concept-01', '159:6286', '/v2-3/cases/deal-points/brainstorm-concept-01.png', 504, 327, 'Start using the Platform wireframe concept'), sourceNodes: ['159:6353', '159:6355', '159:6357', '159:6359', '159:6383'] },
            { title: 'Know how much they saved', body: ['Dynamic CPP Warning System', 'Smart “Cash vs Points” Calculator', 'Total save real-time demonstration', 'Monthly Financial Literacy Report', 'Creating a sense of achievement through optimized point usage'], media: media('brainstorm-concept-02', '159:6286', '/v2-3/cases/deal-points/brainstorm-concept-02.png', 504, 327, 'Savings awareness wireframe concept'), sourceNodes: ['159:6351', '159:6363', '159:6365', '159:6367', '159:6369', '159:6384'] },
            { title: 'Keep using the app', body: ['“Price Drop + Points Spike Alerts”', '“Deal Points Daily Feed”', 'Point Redeem tutorial', '“Expiration Protection” System', 'Helping users build long-term security through consistent habits'], media: media('brainstorm-concept-03', '159:6286', '/v2-3/cases/deal-points/brainstorm-concept-03.png', 504, 327, 'Long-term points-use wireframe concept'), sourceNodes: ['159:6382', '159:6372', '159:6374', '159:6376', '159:6378', '159:6385'] },
          ],
          body: ['Based on the three user pain points identified in our preliminary research, I brainstormed around these key stages.'],
          sourceNodes: ['159:6386'],
        },
        {
          id: 'competitors',
          title: 'Product definition',
          layout: 'wide',
          body: ['Most of the product on the market never mentioned CPP', 'Showing the best way to earning point in different Catgory'],
          media: [media('competitor-matrix', '159:6408', '/v2-3/cases/deal-points/competitor-matrix.png', 1111, 317, 'Feature comparison matrix for point-reward products', 'Competitor comparison')],
          sourceNodes: ['159:6407', '159:6408', '159:6752'],
        },
        {
          id: 'definition',
          title: 'Website',
          layout: 'cards',
          body: ['Deal Points is an all-in-one platform that helps young users understand, optimize, and maximize their credit card points while building real financial literacy through everyday actions.'],
          items: [{ title: 'Target user', body: ['young users'] }, { title: 'Purpose', body: ['real financial literacy'] }, { title: 'Methods', body: ['understand, optimize, and maximize their credit card points'] }],
          sourceNodes: ['159:6389', '159:6391', '159:6396', '159:6401', '159:6405'],
        },
      ],
    },
    {
      id: 'flight-flows',
      sourceFrame: '159:6816',
      title: 'Step 2: How Users Know They Saved Money',
      sections: [
        {
          id: 'flow-one',
          title: 'User flow 1 : Start to explore flight deal',
          layout: 'grid',
          items: [
            { body: ['When users first join the platform, they’re asked to indicate their experience level with travel-reward credit cards'], media: flowScreens[0], sourceNodes: ['159:7182'] },
            { body: ['Here will be the definition for what is cents per point and very important rule of measuring points value'], media: flowScreens[1], sourceNodes: ['159:7183'] },
            { body: ['Deal page is personalized based on the user’s past behavior and their home airport, covering both airline tickets and hotel'], media: flowScreens[2], sourceNodes: ['159:7184'] },
            { body: ['User can also search their destination, date, and flexible, date, and cabin class'], media: flowScreens[3], sourceNodes: ['159:7185'] },
          ],
          sourceNodes: ['159:6819', '159:6831', '159:6855', '159:6927', '159:6994'],
        },
        {
          id: 'flow-two',
          title: 'User flow 2 : Compare CPP to maximize points use',
          layout: 'grid',
          items: [
            { body: ['Users can view ticket details as usual, but the platform also shows the point value and ranks the best redemption options for them'], media: flowScreens[4], sourceNodes: ['159:7177'] },
            { body: ['Users can view the cabin layout, see full ticket details, and understand exactly how their points need to transfer to the airline'], media: flowScreens[5], sourceNodes: ['159:7178'] },
            { body: ['A detailed view of the aircraft, seating layout, and also real cabin pictures in the next for user to get a sense of the cabin'], media: flowScreens[6], sourceNodes: ['159:7179'] },
            { body: ['The platform redirects to the official site, and an extension guides user step-by-step through points transfer and booking'], media: flowScreens[7], sourceNodes: ['159:7180'] },
          ],
          sourceNodes: ['159:6818', '159:7067', '159:7097', '159:7121', '159:7152'],
        },
      ],
    },
    {
      id: 'hotel-testing',
      sourceFrame: '159:7192',
      title: 'Hotel journey and user testing',
      sections: [
        {
          id: 'hotel-flow',
          title: 'Other',
          layout: 'grid',
          items: [
            { body: ['Show the value of point and uncompleted credit card park and the total saving'], media: flowScreens[8], sourceNodes: ['159:7355'] },
            { body: ['Using map to browse best hotel deal'], media: flowScreens[9], sourceNodes: ['159:7356'] },
            { body: ['Hotel details with point vs cash price and all the information that normal website would have'], media: flowScreens[10], sourceNodes: ['159:7357'] },
            { body: ['Once user tracked the one hotel price, the point history of that hotel will show here'], media: flowScreens[11], sourceNodes: ['159:7358'] },
          ],
          sourceNodes: ['159:7229', '159:7272', '159:7293', '159:7313'],
        },
        {
          id: 'testing',
          title: 'Testing Objectives',
          layout: 'comparison',
          items: [
            { title: 'Testing Objectives', body: ['Onboarding clarity', 'Understandability', 'Savings awareness'], sourceNodes: ['159:7198', '159:7199', '159:7200', '159:7201'] },
            { title: 'Testing Resources', body: ['Devices: Laptop (Mac/PC)', 'Participants: 6 users for each round', 'Method: Net Promoter Score'], sourceNodes: ['159:7203', '159:7204', '159:7205', '159:7206'] },
            { title: 'Testing Result', body: ['Devices: Laptop (Mac/PC)', 'Participants: 12 users', 'Engagement motivation'], sourceNodes: ['159:7208', '159:7209', '159:7210', '159:7211'] },
          ],
        },
        {
          id: 'user-feedback',
          title: 'User feedback',
          layout: 'wide',
          table: {
            caption: 'Net Promoter Score',
            columns: ['Round', 'Start — Tooltip', 'Process — Flight', 'Process — Hotel', 'Saved — Wallet', 'General — Net Promoter Score'],
            rows: [
              ['Round 1 (Low-Fi User Test)', '6.33/10', '7.83/10', '8.17/10', '8.48/10', '0'],
              ['Round 2 (Hi-Fi User Test)', '7.63/10', '8.60/10', '8.20/10', '8.90/10', '20'],
            ],
          },
          sourceNodes: ['159:7352', '159:7353', '159:7376', '159:7379', '159:7381', '159:7383', '159:7385', '159:7388', '159:7391', '159:7393', '159:7395', '159:7397', '159:7400', '159:7403', '159:7405', '159:7407', '159:7409', '159:7424', '159:7427', '159:7429', '159:7431'],
        },
        {
          id: 'testing-notes',
          title: 'Future Plan',
          layout: 'wide',
          body: [
            'I ran two rounds of user testing using the Net Promoter Score to understand how clearly purpose is delivering and where users still feel uncertain or confused.',
            'The feedback shows that users appreciate the core idea but still struggle with parts of the flow—especially what the system does, how the avatar responds, and what actions they’re expected to take next. These gaps reveal that the onboarding, UI cues, and explanation of system logic need to be sharper. Improving clarity and reducing cognitive load would likely raise confidence and NPS in the next round.',
          ],
          sourceNodes: ['159:7442', '159:7443', '159:7444'],
        },
        {
          id: 'business-model',
          title: 'Business model',
          layout: 'cards',
          items: [
            {
              title: 'Revenue Model',
              body: ['Subscription (monthly / yearly)\nCredit card partnerships\nPersonalized card recommendations ads\nTargeted ads based on spending behavior'],
              media: media('payment-partnership', '159:7362', '/v2-3/cases/deal-points/payment-partnership.png', 860, 384, 'Visa and Mastercard partnership graphic'),
              sourceNodes: ['159:7360', '159:7361', '159:7362'],
            },
            {
              title: 'Market Trends',
              body: ['Rising Google search for “reward travel”\nGrowing credit card competition\nIncreasing interest in maximizing points'],
              media: media('partnership-illustration', '159:7372', '/v2-3/cases/deal-points/partnership-illustration.png', 640, 640, 'Partnership illustration'),
              sourceNodes: ['159:7372', '159:7446', '159:7447'],
            },
            {
              title: 'Potential Challenges',
              body: ['Visa&Mastercard is planning to lowering merchant fees\nPossible reduction in reward points\nImpact on issuer revenue\nNeed to adapt if points devalue'],
              media: media('business-illustration', '159:7192', '/v2-3/cases/deal-points/business-illustration.png', 572, 570, 'Business illustration'),
              sourceNodes: ['159:7373', '159:7450', '159:7451'],
            },
          ],
        },
      ],
    },
  ],
};
