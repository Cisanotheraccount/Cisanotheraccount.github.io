import type { HarvardChapter, HarvardMedia } from '../harvardCaseTypes';

const media = (
  id: string,
  sourceNode: string,
  image: string,
  width: number,
  height: number,
  alt: string,
  caption?: string,
  background?: HarvardMedia['background'],
): HarvardMedia => ({ id, sourceNode, image, width, height, alt, caption, background });

export const psytrainResearchMedia = {
  missionCardOne: media('research-mission-card-1', '159:4739', '/v2-3/cases/psytrain/research-mission-card-1.png', 1949, 2573, 'Creating an AI Powered VR Simulation Platform for Social Work Skill Development — paper reference', undefined, 'light'),
  missionCardTwo: media('research-mission-card-2', '159:4740', '/v2-3/cases/psytrain/research-mission-card-2.png', 2271, 2685, 'Conversation flow figure and discussion from the referenced paper', undefined, 'light'),
  roleplayScript: media('research-roleplay-script', '159:4725', '/v2-3/cases/psytrain/research-roleplay-script.png', 2000, 2000, 'Illustration of two people following a scripted roleplay', undefined, 'transparent'),
  roleplayPeer: media('research-roleplay-peer', '159:4727', '/v2-3/cases/psytrain/research-roleplay-peer.png', 2000, 2000, 'Illustration of students practicing together in a classroom', undefined, 'transparent'),
  roleplayFeedback: media('research-roleplay-feedback', '159:4726', '/v2-3/cases/psytrain/research-roleplay-feedback.png', 2000, 2000, 'Illustration of an instructor giving feedback at a board', undefined, 'transparent'),
  painpointFeedback: media('research-painpoint-feedback', '159:4801', '/v2-3/cases/psytrain/research-painpoint-feedback.png', 2048, 2048, 'Source visual for absence of emotional feedback', undefined, 'light'),
  painpointScenarios: media('research-painpoint-scenarios', '159:4802', '/v2-3/cases/psytrain/research-painpoint-scenarios.png', 2048, 2048, 'Source visual for realistic practice scenarios', undefined, 'light'),
  painpointGrowth: media('research-painpoint-growth', '159:4803', '/v2-3/cases/psytrain/research-painpoint-growth.png', 2048, 2048, 'Source visual for over-scripting limits growth', undefined, 'light'),
  painpointSafety: media('research-painpoint-safety', '159:4804', '/v2-3/cases/psytrain/research-painpoint-safety.png', 2048, 2048, 'Source visual for emotional safety in early training', undefined, 'light'),
  competitorWysa: media('research-competitor-wysa', '159:4797', '/v2-3/cases/psytrain/research-competitor-wysa.png', 1500, 844, 'Wysa product image from the source comparison', undefined, 'light'),
  competitorReplika: media('research-competitor-replika', '159:4798', '/v2-3/cases/psytrain/research-competitor-replika.jpeg', 1200, 630, 'Replika product image from the source comparison', undefined, 'light'),
  competitorYouper: media('research-competitor-youper', '159:4799', '/v2-3/cases/psytrain/research-competitor-youper.png', 1920, 1080, 'Youper product image from the source comparison', undefined, 'light'),
  competitorSpringHealth: media('research-competitor-spring-health', '159:4800', '/v2-3/cases/psytrain/research-competitor-spring-health.png', 800, 534, 'Spring Health product image from the source comparison', undefined, 'light'),
  referenceCluster: media('system-reference-cluster', '159:4822', '/v2-3/cases/psytrain/system-brainstorm-transparent.png', 1609, 2822, 'Brainstorm collage connecting Avatar, Time limitation, Realistic, Immersive Experience, Emotion and VR headset', '', 'transparent'),
  landingFlow: media('system-landing-flow', '159:4822', '/v2-3/cases/psytrain/system-ideation-landing.png', 2020, 556, 'Landing Page: complete sketch, spatial cards and wireframe', 'Landing Page', 'transparent'),
  conversationFlow: media('system-conversation-flow', '159:4876', '/v2-3/cases/psytrain/system-ideation-conversation.png', 2020, 556, 'Conversation Page: complete sketch and wireframe', 'Conversation Page', 'transparent'),
  resultFlow: media('system-result-flow', '159:4948', '/v2-3/cases/psytrain/system-ideation-result.png', 2020, 556, 'Result Page: complete sketch and wireframe', 'Result Page', 'transparent'),
  avatarRationale: media('system-avatar-rationale-complete', '159:4822', '/v2-3/cases/psytrain/system-avatar-rationale-complete.png', 1036, 2868, 'Complete Avatar Aesthetic Rationale: ANA, Alita and Rendora references flow into Emma through the original green transition bands, with all labels and explanations', '', 'transparent'),
};

export const psytrainResearchChapters: HarvardChapter[] = [
  {
    id: 'research',
    sourceFrame: '159:4708',
    title: 'Research',
    lead: ['“Social work students often struggle to gain enough real-world interaction practice with vulnerable populations before entering the field. Traditional role-play exercises are limited in realism, consistency, and emotional feedback. There’s a lack of scalable tools for immersive, emotionally responsive training.”'],
    sections: [
      {
        id: 'research-design-mission',
        title: 'Design Mission',
        layout: 'split',
        body: ['My goal was to design an interactive VR training system that feels perceptive, responsive, and human. I expanded the original concept through research on counseling interaction models, built AI logic for dynamic responses, designed the avatar and training flow, crafted an immersive Unreal Engine scene, and developed Vision Pro–specific UI for natural spatial interaction.'],
        media: [psytrainResearchMedia.missionCardOne, psytrainResearchMedia.missionCardTwo],
        sourceNodes: ['159:4710', '159:4738', '159:4739', '159:4740'],
      },
      {
        id: 'research-traditional-workflow',
        title: 'Traditional Workflow of Counseling Education',
        layout: 'steps',
        items: [
          {
            title: 'Script-Based Roleplay',
            body: ['Students are assigned a fixed role (e.g., counselor or patient) and follow a pre-written script. Emotional expression is often exaggerated or superficial.'],
            media: psytrainResearchMedia.roleplayScript,
            sourceNodes: ['159:4717', '159:4718', '159:4725'],
          },
          {
            title: 'Peer Practice in Classroom',
            body: ['Roleplay is conducted with classmates in low-pressure settings. Emotional authenticity is limited, and reactions are predictable and repetitive.'],
            media: psytrainResearchMedia.roleplayPeer,
            sourceNodes: ['159:4720', '159:4721', '159:4727'],
          },
          {
            title: 'Instructor Feedback',
            body: ['After the session, instructors give general feedback. Sessions are not repeatable, and trainees lack opportunity to iterate specific emotional skills.'],
            media: psytrainResearchMedia.roleplayFeedback,
            sourceNodes: ['159:4723', '159:4724', '159:4726'],
          },
        ],
        sourceNodes: ['159:4711', '159:4715'],
      },
      {
        id: 'research-pain-point',
        title: 'Pain Point',
        layout: 'cards',
        items: [
          {
            title: 'Lack of Realistic Practice Scenarios',
            body: ['Trainees rarely encounter unpredictable, emotionally complex cases. Most practice is limited to scripted classroom role-play with peers, lacking realism, pressure, or diverse patient behaviors.'],
            media: psytrainResearchMedia.painpointScenarios,
            sourceNodes: ['159:4713', '159:4714'],
          },
          {
            title: 'Absence of Emotional Feedback',
            body: ['Existing AI tools provide only verbal responses. Without synchronized facial expressions, students cannot train to recognize subtle emotional shifts or respond to nonverbal cues during conversations.'],
            media: psytrainResearchMedia.painpointFeedback,
            sourceNodes: ['159:4729', '159:4730'],
          },
          {
            title: 'Over-Scripting Limits Growth',
            body: ['Live role-plays are time-bound, one-time experiences. Students have little chance to retry, reflect, or refine their emotional responses across multiple attempts with consistent patient conditions.'],
            media: psytrainResearchMedia.painpointGrowth,
            sourceNodes: ['159:4732', '159:4733'],
          },
          {
            title: 'Emotional Safety in Early Training',
            body: ['Beginners often fear making mistakes when practicing with real people. This anxiety hinders learning and reduces their ability to test emotional boundaries or build confidence gradually.'],
            media: psytrainResearchMedia.painpointSafety,
            sourceNodes: ['159:4735', '159:4736'],
          },
        ],
        sourceNodes: ['159:4712', '159:4728', '159:4731', '159:4734'],
      },
      {
        id: 'research-existing-ai-products',
        title: 'Competitive Analysis',
        layout: 'wide',
        itemsTitle: 'Product Image',
        table: {
          caption: 'Source comparison',
          columns: ['Name', 'Wysa', 'Replika', 'Youper', 'Spring Health'],
          rows: [
            ['Core Feature', 'AI emotional companion for daily conversations', 'AI CBT tools plus guided self-help', 'AI CBT/ACT guidance with emotion tracking', 'Enterprise mental-health screening and care matching'],
            ['Best For', 'Young users seeking connection', 'Users managing stress/anxiety', 'Users wanting structured self-help', 'Corporations / HR teams'],
            ['Pricing', '$7.99–$19.99/mo', '$9.99/mo', '$14.99–$24.99/mo', 'Enterprise only'],
            ['Human Support', '✕', '✓', '✕', '✓'],
            ['Limitations', 'Not clinical; emotional accuracy varies', 'Responses can feel generic', 'Not interactive; feels like a tool, not a conversation', 'Not consumer-focused; no conversational component'],
            ['Opportunity', 'Add clinical structure + micro-expression cues', 'Provide immersive VR + real-time emotional shifts', 'Offer realistic, real-time conversation training', 'Focus on clinician training, not employee care'],
          ],
        },
        items: [
          { title: 'Wysa', media: psytrainResearchMedia.competitorWysa, sourceNodes: ['159:4743', '159:4797'] },
          { title: 'Replika', media: psytrainResearchMedia.competitorReplika, sourceNodes: ['159:4745', '159:4798'] },
          { title: 'Youper', media: psytrainResearchMedia.competitorYouper, sourceNodes: ['159:4747', '159:4799'] },
          { title: 'Spring Health', media: psytrainResearchMedia.competitorSpringHealth, sourceNodes: ['159:4749', '159:4800'] },
        ],
        sourceNodes: ['159:4741', '159:4750', '159:4751', '159:4752', '159:4753', '159:4754', '159:4757', '159:4755', '159:4761', '159:4763', '159:4765', '159:4781', '159:4786', '159:4791'],
      },
      {
        id: 'research-learner-profile',
        title: 'User Archetype',
        layout: 'comparison',
        items: [
          {
            title: 'User Profile:',
            body: ['Students training to become counselors; knowledgeable in theory but lacking real emotional practice.'],
            sourceNodes: ['159:4811', '159:4812'],
          },
          {
            title: 'Motivations',
            body: ['• Build confidence • Practice difficult conversations • Improve emotional recognition'],
            sourceNodes: ['159:4814', '159:4815'],
          },
          {
            title: 'Frustrations',
            body: ['• Real practice opportunities are too few • Role-plays feel artificial and predictable • Hard to recognize subtle emotions'],
            sourceNodes: ['159:4817', '159:4818'],
          },
          {
            title: 'Needs',
            body: ['A realistic, repeatable, emotionally expressive simulation to practice safely and track progress.'],
            sourceNodes: ['159:4820', '159:4821'],
          },
        ],
        sourceNodes: ['159:4809'],
      },
    ],
  },
  {
    id: 'system-design',
    sourceFrame: '159:4822',
    title: 'System Design',
    sections: [
      {
        id: 'system-reference-cluster',
        title: 'Brainstorm',
        layout: 'wide',
        media: [psytrainResearchMedia.referenceCluster],
        sourceNodes: ['159:4827', '159:4852', '159:4853', '159:4860', '159:4861', '159:4862', '159:4863'],
      },
      {
        id: 'system-training-rationales',
        title: 'Why VR+AI',
        layout: 'cards',
        items: [
          {
            title: '1. Real Training Requires Real Reaction',
            body: ['The avatar is designed with a neutral emotional baseline—neither overtly distressed nor expressive. This subtlety requires trainees to actively interpret micro‑cues such as gaze, tone, and posture, mirroring real clinical conversations where emotional states are rarely explicit. The ambiguity supports more authentic empathic reasoning and observation training.'],
            sourceNodes: ['159:4928', '159:4919'],
          },
          {
            title: '2. Subtle Cues Can’t Be Ignored',
            body: ['Effective mental health professionals must learn to recognize nonverbal signals—micro-expressions, pauses, shifts in tone. These cues often reveal more than words alone. Most training tools overlook these subtle elements. The VR avatar could integrates facial micro-reactions to help users practice emotional sensitivity and refine their interpersonal intuition.'],
            sourceNodes: ['159:4922', '159:4920'],
          },
          {
            title: '3. Immersion Builds Empathy',
            body: ['Immersive environments heighten emotional engagement. In VR, trainees feel physically present with the AI avatar, making interactions more personal and impactful. This spatial realism supports empathic connection, encourages attentiveness, and helps users build the psychological readiness needed for real-world counseling scenarios.'],
            sourceNodes: ['159:4923', '159:4921'],
          },
        ],
        sourceNodes: ['159:4919', '159:4920', '159:4921', '159:4922', '159:4923', '159:4928'],
      },
      {
        id: 'system-flow-sketches',
        title: 'Ideation',
        layout: 'wide',
        media: [psytrainResearchMedia.landingFlow, psytrainResearchMedia.conversationFlow, psytrainResearchMedia.resultFlow],
        sourceNodes: ['159:4864', '159:4865', '159:4866', '159:4867', '159:4868', '159:4869', '159:4870', '159:4871', '159:4872', '159:4873', '159:4874', '159:4875', '159:4876', '159:4881', '159:4892', '159:4893', '159:4894', '159:4895', '159:4896', '159:4902', '159:4903', '159:4904', '159:4905', '159:4906', '159:4907', '159:4908', '159:4909', '159:4910', '159:4911', '159:4948', '159:4953', '159:4965', '159:4966', '159:4967', '159:4968', '159:4969', '159:4970', '159:4971', '159:4972', '159:4973', '159:4975', '159:4976', '159:4977'],
      },
      {
        id: 'system-avatar-aesthetic-rationale',
        title: 'Avatar Aesthetic Rationale',
        layout: 'wide',
        media: [psytrainResearchMedia.avatarRationale],
        transcript: [
          {
            title: 'ANA By KRAFTON',
            body: ['Realistic hair', 'ANA showcases Krafton’s hyper-real virtual human work, built with precise facial sculpting and ultra-fine strand-based hair grooming that captures natural flow, micro-textures, and lifelike light response.'],
            sourceNodes: ['159:4934', '159:4937', '159:4940', '159:4941', '159:4942', '159:4943'],
          },
          {
            title: 'Alita: Battle Angel',
            body: ['Uncanny Villa Reduced', 'Alita blends ultra-precise facial capture with stylized proportions, preserving human emotional nuance while softening realism just enough to avoid the uncanny valley.'],
            sourceNodes: ['159:4935', '159:4938', '159:4912', '159:4913', '159:4914', '159:4915'],
          },
          {
            title: 'Rendora 3D AI Avatar',
            body: ['Natural Avatar Animation and Pose', 'Enhances avatar hand gestures through smooth-motion AI, a unified 3D rig, and expressive animation presets, creating natural, coherent movements that match speech rhythm and overall body expression.'],
            sourceNodes: ['159:4929', '159:4930', '159:4936', '159:4939', '159:4916', '159:4917', '159:4918'],
          },
        ],
        sourceNodes: ['159:4912', '159:4916', '159:4917', '159:4929', '159:4931', '159:4933', '159:4935', '159:4936', '159:4937', '159:4938', '159:4939', '159:4940', '159:4941', '159:4942'],
      },
    ],
  },
];
