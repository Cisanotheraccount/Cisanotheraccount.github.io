import type { HarvardCaseData, HarvardMedia } from '../harvardCaseTypes';

type SourceCopy = { nodeId: string; text: string };

const sourceCopy = {
  "userInsight": [
    {
      "nodeId": "159:4176",
      "text": "User Insight & Problem Framing"
    },
    {
      "nodeId": "I159:4184;1484:508",
      "text": "􀯏 Shift in mindset: "
    },
    {
      "nodeId": "I159:4184;1486:666",
      "text": "Cars are evolving into third living spaces, not just transportation."
    },
    {
      "nodeId": "I159:4185;1484:508",
      "text": "􁐲 Built-In Space Advantages"
    },
    {
      "nodeId": "I159:4185;1486:666",
      "text": "Adjustable, reclining seats\nPersonalized climate control\nPrivacy glass & immersive audio"
    },
    {
      "nodeId": "I159:4186;1484:508",
      "text": "􂮢 Smart Monitoring"
    },
    {
      "nodeId": "I159:4186;1486:666",
      "text": "Automatic Air adjustments\nSleep data converted into personalized health suggestions"
    },
    {
      "nodeId": "I159:4187;1484:508",
      "text": "􂊑 New Scenarios Emerging"
    },
    {
      "nodeId": "I159:4187;1486:666",
      "text": "Napping during midday breaks\nWinding down after long evening drives"
    },
    {
      "nodeId": "159:4190",
      "text": "A well-designed in-vehicle sleep experience turns fragmented car time into quality recovery moments (midday naps & long-drive breaks)"
    },
    {
      "nodeId": "159:4192",
      "text": "Create a smarter sleep environment distinct from traditional bedrooms, leveraging enclosure, mobility, and intelligent sensing"
    },
    {
      "nodeId": "159:4194",
      "text": "Vertically integrate consumer wearables and in-car systems to build a seamless sleep tech ecosystem"
    },
    {
      "nodeId": "159:4196",
      "text": "Expand non-driving use cases to increase the value density of the vehicle, enabling “park & sleep” scenarios"
    },
    {
      "nodeId": "I159:4197;1654:2096",
      "text": "Why In-Vehicle Sleep?"
    },
    {
      "nodeId": "159:4200",
      "text": "Yuhao"
    },
    {
      "nodeId": "159:4202",
      "text": "Age 24"
    },
    {
      "nodeId": "159:4204",
      "text": "Car enthusiast"
    },
    {
      "nodeId": "159:4206",
      "text": "Gen Z"
    },
    {
      "nodeId": "159:4211",
      "text": "Nap time"
    },
    {
      "nodeId": "159:4212",
      "text": "Scenarios 1"
    },
    {
      "nodeId": "159:4215",
      "text": "Commuting"
    },
    {
      "nodeId": "159:4216",
      "text": "Scenarios 2"
    },
    {
      "nodeId": "159:4219",
      "text": "Family Camping"
    },
    {
      "nodeId": "159:4220",
      "text": "Scenarios 3"
    },
    {
      "nodeId": "159:4223",
      "text": "Long-distance travel"
    },
    {
      "nodeId": "159:4224",
      "text": "Scenarios 4"
    },
    {
      "nodeId": "159:4226",
      "text": "Hard to find a place to nap during work\nSleeping problem and relies on medication\nEnergy drops sharply after lunch meal."
    },
    {
      "nodeId": "159:4227",
      "text": "Frustration"
    },
    {
      "nodeId": "159:4229",
      "text": "Sleep in car with less preparation\nPrivacy, cozy environment for sleep.\nAn accessible place during lunch break.\n"
    },
    {
      "nodeId": "159:4230",
      "text": "Goal"
    },
    {
      "nodeId": "I159:4231;1654:2096",
      "text": "Persona"
    },
    {
      "nodeId": "I159:4232;1654:2096",
      "text": "Insight"
    },
    {
      "nodeId": "159:4239",
      "text": "􀙑 "
    },
    {
      "nodeId": "159:4240",
      "text": "Core Needs"
    },
    {
      "nodeId": "159:4241",
      "text": "Design Strategies"
    },
    {
      "nodeId": "159:4244",
      "text": "Gen Z Pain Points"
    },
    {
      "nodeId": "159:4248",
      "text": "Sleeps late but seeks wellness balance"
    },
    {
      "nodeId": "159:4251",
      "text": "Always feel hard to fall a sleep at night, yet they also want to build a healthy body."
    },
    {
      "nodeId": "159:4255",
      "text": "Late-night habits"
    },
    {
      "nodeId": "159:4257",
      "text": "Healthy lifestyle"
    },
    {
      "nodeId": "159:4261",
      "text": "Tired at work but lack rest place"
    },
    {
      "nodeId": "159:4264",
      "text": "Feel tired during work, yet they do not have a comfortable place to rest."
    },
    {
      "nodeId": "159:4268",
      "text": "Office naps"
    },
    {
      "nodeId": "159:4270",
      "text": "In-Car naps"
    },
    {
      "nodeId": "159:4272",
      "text": "Limited car space but values sleep comfort"
    },
    {
      "nodeId": "159:4275",
      "text": "Have a limited in-vehicle space, yet they prioritize comfort sleep during lunch break."
    },
    {
      "nodeId": "159:4279",
      "text": "Limited car space"
    },
    {
      "nodeId": "159:4281",
      "text": "Flexible rest needs"
    },
    {
      "nodeId": "159:4283",
      "text": "Wants stable temp but body needs variation"
    },
    {
      "nodeId": "159:4286",
      "text": "Prefer a consistent temperature, yet the human body requires gradual thermal shifts in during sleep."
    },
    {
      "nodeId": "159:4290",
      "text": "Stable comfort"
    },
    {
      "nodeId": "159:4292",
      "text": "Changing environment"
    },
    {
      "nodeId": "159:4294",
      "text": "Psychological\nNeeds:"
    },
    {
      "nodeId": "159:4296",
      "text": "Achieve fast recovery and high-quality rest\nProfessional or suggested ways to release stress from daily work"
    },
    {
      "nodeId": "159:4298",
      "text": "Physiological\nNeeds:"
    },
    {
      "nodeId": "159:4299",
      "text": "Full privacy\nProper temperature & airflow\nSpaciousness & comfort\nAbility to nap or sleep deeply anytime, anywhere — in the middle of a trip, during breaks, or between meetings"
    },
    {
      "nodeId": "159:4301",
      "text": "Spatial Design:\nmultifunctional sleeping cabin"
    },
    {
      "nodeId": "159:4302",
      "text": "Modular layout: full-flat seat mode, one-click nap mode\nAdaptive shielding (windows, windshield) from outside noise and light\nPrivacy-focused interior zoning to isolate from unwanted external stimuli"
    },
    {
      "nodeId": "159:4304",
      "text": "Digital Function Design: \nAI-powered automatic sleep-adjustment functions"
    },
    {
      "nodeId": "159:4305",
      "text": "AI + biometric sensor data to give scientific sleep recommendations\nEnvironment auto-adjusts (temperature, humidity, lighting, airflow) — no user interaction needed"
    },
    {
      "nodeId": "159:4308",
      "text": "􀘸"
    },
    {
      "nodeId": "159:4310",
      "text": "􁺼"
    },
    {
      "nodeId": "159:4313",
      "text": "􀯐"
    },
    {
      "nodeId": "I159:4314;1654:2096",
      "text": "Problem Define"
    },
    {
      "nodeId": "159:4319",
      "text": "Insight: Cars as the New Sleep Sanctuary for a Generation Facing Sleep Challenges"
    },
    {
      "nodeId": "159:4322",
      "text": "Why Sleep in Cars Matter to Young Users ?"
    },
    {
      "nodeId": "159:4328",
      "text": "Sleepless in a Chaotic World"
    },
    {
      "nodeId": "159:4329",
      "text": "In a restless world, young dreamers are losing sleep—trapped in chaotic schedules, digital overload, and silent burnout."
    },
    {
      "nodeId": "159:4334",
      "text": "Micro-Rests Beyond the Bedroom"
    },
    {
      "nodeId": "159:4335",
      "text": "While sleep tech flourishes in bedrooms, it overlooks the quiet power of micro-rests—in cars, in motion, between moments."
    },
    {
      "nodeId": "159:4340",
      "text": "From Transit to Sanctuary"
    },
    {
      "nodeId": "159:4341",
      "text": "For a generation always on the move, the car must evolve—from mere transport to a sanctuary of stillness, where recovery begins before the destination arrives."
    }
  ],
  "systemBlueprint": [
    {
      "nodeId": "159:4349",
      "text": "Infrared cameras detect the sleeper’s body temperature by capturing naturally emitted thermal radiation and converting it into real-time temperature data."
    },
    {
      "nodeId": "159:4353",
      "text": "In seat pressure sensors and temperature sensors work with AI to monitor heart rate and sleep stages. Collected physiological data is analyzed in real time to detect light sleep, deep sleep, REM phases, and overall sleep quality."
    },
    {
      "nodeId": "159:4357",
      "text": "First-class aviation seating, the lie-flat seat transforms from upright to a full 180° bed with seamless motorized adjustment. Integrated support zones adapt to posture, ensuring ergonomic comfort throughout the sleep cycle."
    },
    {
      "nodeId": "159:4361",
      "text": "A power system integrates vehicle-wide sensors and intelligent algorithms to coordinate climate, seating, lighting, and notifications—enabling real-time adjustments that optimize in-car sleep and health monitoring."
    },
    {
      "nodeId": "159:4365",
      "text": "The final result is a smart, responsive cabin environment that adjusts in real time—modifying temperature, lighting, seat angles, and notification and show everything AI did on screen to info user. "
    },
    {
      "nodeId": "159:4368",
      "text": "Input"
    },
    {
      "nodeId": "159:4369",
      "text": "Processing"
    },
    {
      "nodeId": "159:4370",
      "text": "Output"
    },
    {
      "nodeId": "I159:4374;1608:1749",
      "text": "1"
    },
    {
      "nodeId": "I159:4375;1608:1749",
      "text": "2"
    },
    {
      "nodeId": "I159:4376;1608:1749",
      "text": "3"
    },
    {
      "nodeId": "I159:4377;1608:1749",
      "text": "4"
    },
    {
      "nodeId": "I159:4378;1608:1749",
      "text": "5"
    },
    {
      "nodeId": "I159:4379;1654:2096",
      "text": "Interaction Pipeline"
    },
    {
      "nodeId": "159:4381",
      "text": "System Blueprint"
    },
    {
      "nodeId": "159:4388",
      "text": "Core technical integration: the sleep capsule must connect seamlessly with vehicle-wide sensor data, the onboard system, and the AI assistant for synchronized control and feedback."
    },
    {
      "nodeId": "159:4391",
      "text": "1"
    },
    {
      "nodeId": "159:4393",
      "text": "2"
    },
    {
      "nodeId": "159:4395",
      "text": "5"
    },
    {
      "nodeId": "159:4397",
      "text": "3"
    },
    {
      "nodeId": "159:4399",
      "text": "4"
    },
    {
      "nodeId": "159:4405",
      "text": "2011"
    },
    {
      "nodeId": "159:4407",
      "text": "Jeep"
    },
    {
      "nodeId": "159:4408",
      "text": "Roof-top tents offer shelter with vehicle external power output but lack built-in temperature control. "
    },
    {
      "nodeId": "159:4413",
      "text": "2017"
    },
    {
      "nodeId": "159:4414",
      "text": "Rear trunk bed mode introduces modular sleep space via screen control. Improvised but aligns with users’need for spontaneous car naps."
    },
    {
      "nodeId": "159:4416",
      "text": "Model Y"
    },
    {
      "nodeId": "159:4421",
      "text": "2019"
    },
    {
      "nodeId": "159:4422",
      "text": "Transformed Car into a mobile bedroom with bed modes, massage seats, quiet cabin,  built-in fridge."
    },
    {
      "nodeId": "159:4424",
      "text": "Li L9"
    },
    {
      "nodeId": "159:4429",
      "text": "2021"
    },
    {
      "nodeId": "159:4430",
      "text": "Equipped with a foldable bed, built-in  kitchen, multifunctional table, and ample storage. The interior design maximizes space."
    },
    {
      "nodeId": "159:4432",
      "text": "Dembell"
    },
    {
      "nodeId": "159:4437",
      "text": "2024"
    },
    {
      "nodeId": "159:4438",
      "text": "Dumbbell’s extendable body provides users with more space when parked and equipped with premium furniture."
    },
    {
      "nodeId": "159:4440",
      "text": "VW california"
    },
    {
      "nodeId": "159:4445",
      "text": "Installable modular sleeping environments that fold or extend intuitively"
    },
    {
      "nodeId": "159:4454",
      "text": "Environmental adjustment system based on body metrics (temp, humidity, light, noise)"
    },
    {
      "nodeId": "159:4460",
      "text": "Enable stationary + mobile sleep (sleep in transit or at rest)"
    },
    {
      "nodeId": "159:4466",
      "text": "Design for expandable interior zoning that separates sleep vs utility"
    },
    {
      "nodeId": "159:4472",
      "text": "The compact interior design integrates multiple functions, with the shower feature."
    },
    {
      "nodeId": "I159:4475;1654:2096",
      "text": "Competitive Analysis"
    },
    {
      "nodeId": "159:4476",
      "text": "Takeaways"
    },
    {
      "nodeId": "159:4482",
      "text": "Oura Ring"
    },
    {
      "nodeId": "159:4483",
      "text": "Tracks biometrics like HRV & temperature\nEnables passive, continuous monitoring"
    },
    {
      "nodeId": "159:4487",
      "text": "Eight Sleep"
    },
    {
      "nodeId": "159:4488",
      "text": "Smart mattress with thermal zones\nAuto-adjusts sleep environment"
    },
    {
      "nodeId": "159:4492",
      "text": "Airline Business Seat"
    },
    {
      "nodeId": "159:4493",
      "text": "Lie-flat Transformation\nErgonomic Support\nSleep-Optimized Design\nPremium Comfort"
    },
    {
      "nodeId": "159:4496",
      "text": "Wearables and in-car sensor track sleep and body status, provide user a sleep evaluation\n\nSmart seats combine ventilation, heating, and massage with temperature sensing for auto adaptive comfort during different sleep stage\n\nFull-flat transformation of seating with ergonomic support\n\nMeditation and sleep music integrate with enclosed cabin space for immersive rest modes"
    },
    {
      "nodeId": "159:4497",
      "text": "Supporting Technologies & Peripheral Concepts"
    },
    {
      "nodeId": "159:4498",
      "text": "Consumer Tech Innovations"
    }
  ],
  "sleepFlow": [
    {
      "nodeId": "I159:4504;1695:1493",
      "text": "Before entry the vehicle users can also activate sleep mode preparation in advance through the mobile app"
    },
    {
      "nodeId": "I159:4504;1695:1495",
      "text": "Preparation"
    },
    {
      "nodeId": "I159:4504;1695:1497",
      "text": "Based on the user’s schedule, the AI assistant automatically adjusts the cabin temperature and reclines the seat into sleep mode 30 minutes before sleep begins"
    },
    {
      "nodeId": "I159:4504;1695:1496",
      "text": "Based on user’s habit, Agent will pick user’s favorite sleep music and set the sleeping time based on user’s schedule"
    },
    {
      "nodeId": "159:4509",
      "text": "After entering the vehicle, the AI agent would first confirm with the user for starting the sleep mode"
    },
    {
      "nodeId": "159:4511",
      "text": "Non-distribute Environment"
    },
    {
      "nodeId": "159:4512",
      "text": "Privacy curtains rise for fully lightproof environment. Sentry Mode start, projecting on screen"
    },
    {
      "nodeId": "159:4513",
      "text": "Active noise cancellation start"
    },
    {
      "nodeId": "159:4514",
      "text": "Background audio options: ASMR / white noise / audiobooks"
    },
    {
      "nodeId": "159:4515",
      "text": "Pre-sleep massage mode start"
    },
    {
      "nodeId": "I159:4516;1695:1493",
      "text": "Usually human would prefer cooler temperature before sleep and warmer temperature during waking. "
    },
    {
      "nodeId": "I159:4516;1695:1495",
      "text": "Temperature Control"
    },
    {
      "nodeId": "I159:4516;1695:1497",
      "text": "AI cools the cabin before sleep and gently warms it before wake-up.\nSeat temperature adjusts via humidity sensors and infrared cameras."
    },
    {
      "nodeId": "I159:4516;1695:1496",
      "text": "Airflow is redirected away from the user to create a uniformed ambient temperature."
    },
    {
      "nodeId": "I159:4517;1695:1493",
      "text": "In an enclosed vehicle, carbon dioxide levels gradually increase as sleep duration extends."
    },
    {
      "nodeId": "I159:4517;1695:1495",
      "text": "Air Quality Monitoring"
    },
    {
      "nodeId": "I159:4517;1695:1497",
      "text": "Air quality sensors help maintain safe CO₂ levels in enclosed environments like underground garages. "
    },
    {
      "nodeId": "I159:4517;1695:1496",
      "text": "If CO₂ exceeds a defined threshold, the system gently wakes the user. \nThe built-in air purifier activates when air quality drops."
    },
    {
      "nodeId": "I159:4518;1695:1493",
      "text": "Snoring may occur during sleep.\nIncoming messages—calls, texts, and emails—may arrive during sleep and are intelligently filtered."
    },
    {
      "nodeId": "I159:4518;1695:1495",
      "text": "Snoring Detecting"
    },
    {
      "nodeId": "I159:4518;1695:1497",
      "text": "When snoring is detected, the system identifies the user and gently adjusts seat angle individually—minimizing snoring without disturbing sleep."
    },
    {
      "nodeId": "I159:4518;1695:1496",
      "text": "Notifications are muted during sleep, with alerts only for repeated calls."
    },
    {
      "nodeId": "I159:4519;1695:1493",
      "text": "A summary of sleeping data and notifications appears on screen when the user wakes up."
    },
    {
      "nodeId": "I159:4519;1695:1495",
      "text": "Smooth Wake-up"
    },
    {
      "nodeId": "I159:4519;1695:1497",
      "text": "Lighting slowly brightens once the camera detects the user is awaking."
    },
    {
      "nodeId": "I159:4519;1695:1496",
      "text": "A summary of notifications appears on screen when the user wakes up."
    },
    {
      "nodeId": "159:4521",
      "text": "Timeline"
    },
    {
      "nodeId": "159:4525",
      "text": "􁂮\nStory-\nboard"
    },
    {
      "nodeId": "159:4527",
      "text": "􀓣\nUser\nAction"
    },
    {
      "nodeId": "159:4529",
      "text": "􂮢\nAgent\nAction"
    },
    {
      "nodeId": "159:4531",
      "text": "Sleep Flow & Design"
    },
    {
      "nodeId": "159:4539",
      "text": "Before Entry"
    },
    {
      "nodeId": "159:4544",
      "text": "Before Sleep"
    },
    {
      "nodeId": "159:4548",
      "text": "After Sleep"
    },
    {
      "nodeId": "159:4552",
      "text": "During Sleep"
    },
    {
      "nodeId": "I159:4553;1654:2096",
      "text": "Storyboard"
    },
    {
      "nodeId": "I159:4554;1654:2096",
      "text": "Vehicle Interior Design"
    },
    {
      "nodeId": "159:4557",
      "text": "􁂩 Drive Mode"
    },
    {
      "nodeId": "159:4559",
      "text": "• Upright Seating Layout"
    },
    {
      "nodeId": "159:4560",
      "text": "• Optimized Display Viewing Angle"
    },
    {
      "nodeId": "159:4561",
      "text": "• Ergonomic Support"
    },
    {
      "nodeId": "159:4562",
      "text": "• Ambient Lighting & Side "
    },
    {
      "nodeId": "159:4566",
      "text": "􀙪 Rest Mode"
    },
    {
      "nodeId": "159:4569",
      "text": "􀄭"
    },
    {
      "nodeId": "159:4570",
      "text": "Change with\none command"
    },
    {
      "nodeId": "159:4573",
      "text": "• Fully Reclining Seats"
    },
    {
      "nodeId": "159:4574",
      "text": "• Seamless 180° Flatbed"
    },
    {
      "nodeId": "159:4575",
      "text": "• Foldable Steering Wheel"
    },
    {
      "nodeId": "159:4576",
      "text": "• Private Rest Environment"
    }
  ],
  "sleepStage": [
    {
      "nodeId": "159:4581",
      "text": "Preparing for Sleep in the Vehicle: A voice prompt is played, the in-car display shows sleep preparation status, and the sunshades automatically rise to block external light."
    },
    {
      "nodeId": "159:4583",
      "text": "Preparing for Sleep in the Vehicle: A voice prompt is played, the in-car display shows sleep preparation status on display."
    },
    {
      "nodeId": "159:4594",
      "text": "Adjusts the cabin temperature depend on passengers’ Vitals to maintain optimal comfort during rest."
    },
    {
      "nodeId": "159:4596",
      "text": "􀇬"
    },
    {
      "nodeId": "159:4597",
      "text": "AI Temperature Control"
    },
    {
      "nodeId": "159:4599",
      "text": "Monitors in-car air quality, ensuring fresh air circulation throughout sleep and alerts passengers when it critical point."
    },
    {
      "nodeId": "159:4601",
      "text": "􁒸"
    },
    {
      "nodeId": "159:4602",
      "text": "AI Air Quality Control"
    },
    {
      "nodeId": "159:4604",
      "text": "Actively reduces interior noise by monitoring outside noise."
    },
    {
      "nodeId": "159:4606",
      "text": "􀸷"
    },
    {
      "nodeId": "159:4607",
      "text": "AI Active Noise Cancellation"
    },
    {
      "nodeId": "159:4609",
      "text": "Silences alerts and filters incoming messages, only delivering urgent phone calls."
    },
    {
      "nodeId": "159:4611",
      "text": "􁋬"
    },
    {
      "nodeId": "159:4612",
      "text": "AI Notification Control"
    },
    {
      "nodeId": "159:4613",
      "text": "􁜮"
    },
    {
      "nodeId": "159:4615",
      "text": "Sense of Security"
    },
    {
      "nodeId": "159:4616",
      "text": "During the sleep mode, Sentry Mode will start and show the 360-degree view of the surroundings on the display, so even all the windows are blocked by privacy curtain, inside user can still see the outside. Moreover, AI will analysis the action of people who are around the vehicle and alert user when there is an accident."
    },
    {
      "nodeId": "159:4619",
      "text": "Mobile UI"
    },
    {
      "nodeId": "159:4620",
      "text": "Manually activated Sleep model before entering on the phone"
    },
    {
      "nodeId": "159:4621",
      "text": "􁟦"
    },
    {
      "nodeId": "159:4623",
      "text": "􀬁"
    },
    {
      "nodeId": "159:4626",
      "text": "Designs"
    },
    {
      "nodeId": "I159:4632;1654:2096",
      "text": "Before Sleep Stage"
    },
    {
      "nodeId": "I159:4633;1654:2096",
      "text": "Sleep Stage"
    }
  ],
  "feedback": [
    {
      "nodeId": "I159:4639;1654:2096",
      "text": "After Sleep Stage"
    },
    {
      "nodeId": "I159:4640;1654:2096",
      "text": "After Plan"
    },
    {
      "nodeId": "I159:4641;1654:2096",
      "text": "User Feedback"
    },
    {
      "nodeId": "159:4643",
      "text": "Positive Insights"
    },
    {
      "nodeId": "159:4644",
      "text": "Comfort & Private: Users described the in-car sleep experience as calm and Private. The visual and auditory transitions between different sleep stages seems “comfortable and natural.”"
    },
    {
      "nodeId": "159:4645",
      "text": "AI Adaptivity: The AI Temperature Control and Gentle Wake-up features were highlighted as the most valuable functions, giving users a sense that the system “understands them”."
    },
    {
      "nodeId": "159:4647",
      "text": "Average overall satisfaction"
    },
    {
      "nodeId": "159:4648",
      "text": "Number of Test Users: 6"
    },
    {
      "nodeId": "159:4649",
      "text": "Testing Method: Storyboard + PPT"
    },
    {
      "nodeId": "159:4653",
      "text": "4.2/5.0"
    },
    {
      "nodeId": "159:4654",
      "text": "Areas for Improvement"
    },
    {
      "nodeId": "159:4655",
      "text": "Transparency of Action: Some users wanted more visible cues explaining why the AI makes certain adjustments to build deeper trust."
    },
    {
      "nodeId": "159:4656",
      "text": "Wake-up Control: Although the “Gentle Wake-up” mode was well-received, users suggested adding an optional manual wake-up gesture or voice command for flexibility."
    },
    {
      "nodeId": "159:4657",
      "text": "Wake-up Control: Although the “Gentle Wake-up” mode was well-received, users suggested adding an optional manual wake-up gesture or voice command for flexibility."
    },
    {
      "nodeId": "159:4659",
      "text": "Wake & Learn"
    },
    {
      "nodeId": "I159:4666;50:8652",
      "text": "AI Gentle Wake-up "
    },
    {
      "nodeId": "I159:4666;50:8653",
      "text": "Seat ventilation and heating auto-adjust based on body temperature. "
    },
    {
      "nodeId": "I159:4666;50:8654",
      "text": "30 minutes before wake-up, cabin warmth and ambient light gradually increase for a gentle, comfortable transition."
    },
    {
      "nodeId": "I159:4667;50:8652",
      "text": "AI Sleep Data Visualization"
    },
    {
      "nodeId": "I159:4667;50:8653",
      "text": "Displays a clear summary of user’s sleep data: Heart Rate, Blood Oxygen and Body Temperature and  including the proportion of deep vs. light sleep and an overall sleep quality rating."
    },
    {
      "nodeId": "I159:4668;50:8652",
      "text": "AI Health Suggestions"
    },
    {
      "nodeId": "I159:4668;50:8653",
      "text": "Based on your recent sleep and physical state, the AI offers personalized wellness tips—like how much water to drink, how long to stretch, and suggested breathing exercises to boost afternoon energy."
    },
    {
      "nodeId": "I159:4669;50:8659",
      "text": "VR Test: Conduct in-vehicle prototype tests using VR simulation + Game Engine to observe real spatial. "
    },
    {
      "nodeId": "I159:4670;50:8659",
      "text": "AI Function developing: using different sensors to set AI functionality and set up parameters. "
    },
    {
      "nodeId": "I159:4671;50:8659",
      "text": "1:1 Prototype: Create 1:1 interior prototype model with AI feature for further user testing and demonstration."
    },
    {
      "nodeId": "159:4673",
      "text": "Short-Term Refinement"
    },
    {
      "nodeId": "159:4674",
      "text": "Long-Term Development "
    }
  ]
} as const satisfies Record<string, readonly SourceCopy[]>;

const media = {
  mark: { id: 'mark', sourceNode: '159:4147', image: '/v2-3/cases/hypnos-cockpit/hypnos-mark.svg', width: 52.3154, height: 64, alt: 'Hýpnos Cockpit mark.', background: 'transparent' },
  cover: { id: 'cover', sourceNode: '159:4144', image: '/v2-3/cases/hypnos-cockpit/cover-car-cabin.png', width: 1920, height: 700, alt: 'Hýpnos Cockpit vehicle sleeping cabin.', background: 'dark' },
  pipelineThermal: { id: 'pipeline-thermal', sourceNode: '159:4350', image: '/v2-3/cases/hypnos-cockpit/pipeline-thermal.png', width: 916, height: 962, alt: 'Thermal camera.', background: 'dark' },
  pipelineSensors: { id: 'pipeline-sensors', sourceNode: '159:4354', image: '/v2-3/cases/hypnos-cockpit/pipeline-sensors.jpg', width: 1024, height: 1024, alt: 'In-seat sensor.', background: 'dark' },
  pipelineSeat: { id: 'pipeline-seat', sourceNode: '159:4358', image: '/v2-3/cases/hypnos-cockpit/pipeline-seat.jpg', width: 1200, height: 675, alt: 'Lie-flat seat reference.', background: 'dark' },
  pipelinePower: { id: 'pipeline-power', sourceNode: '159:4362', image: '/v2-3/cases/hypnos-cockpit/pipeline-power.jpg', width: 2048, height: 1152, alt: 'Power-system reference.', background: 'dark' },
  pipelineCabin: { id: 'pipeline-cabin', sourceNode: '159:4366', image: '/v2-3/cases/hypnos-cockpit/pipeline-cabin.jpg', width: 1200, height: 668, alt: 'Responsive cabin reference.', background: 'dark' },
  insightChaotic: { id: 'insight-chaotic', sourceNode: '159:4325', image: '/v2-3/cases/hypnos-cockpit/insight-chaotic-world.png', width: 1024, height: 683, alt: 'Sleepless in a Chaotic World illustration.', background: 'dark' },
  insightMicro: { id: 'insight-micro', sourceNode: '159:4331', image: '/v2-3/cases/hypnos-cockpit/insight-micro-rests.png', width: 1024, height: 683, alt: 'Micro-Rests Beyond the Bedroom illustration.', background: 'dark' },
  insightSanctuary: { id: 'insight-sanctuary', sourceNode: '159:4337', image: '/v2-3/cases/hypnos-cockpit/insight-transit-sanctuary.png', width: 1024, height: 683, alt: 'From Transit to Sanctuary illustration.', background: 'dark' },
  persona: { id: 'persona', sourceNode: '159:4207', image: '/v2-3/cases/hypnos-cockpit/persona-portrait.png', width: 961, height: 961, alt: 'Yuhao persona portrait.', background: 'transparent' },
  nap: { id: 'scenario-nap', sourceNode: '159:4210', image: '/v2-3/cases/hypnos-cockpit/scenario-nap.jpg', width: 740, height: 450, alt: 'Nap-time scenario.', background: 'dark' },
  commute: { id: 'scenario-commute', sourceNode: '159:4214', image: '/v2-3/cases/hypnos-cockpit/scenario-commute.jpg', width: 736, height: 1308, alt: 'Commuting scenario.', background: 'dark' },
  camping: { id: 'scenario-camping', sourceNode: '159:4218', image: '/v2-3/cases/hypnos-cockpit/scenario-camping.jpg', width: 736, height: 736, alt: 'Family camping scenario.', background: 'dark' },
  longDrive: { id: 'scenario-long-drive', sourceNode: '159:4222', image: '/v2-3/cases/hypnos-cockpit/scenario-long-drive.jpg', width: 564, height: 564, alt: 'Long-distance travel scenario.', background: 'dark' },
  wireframe: { id: 'system-integration-wireframe', sourceNode: '159:4387', image: '/v2-3/cases/hypnos-cockpit/system-integration-wireframe.png', width: 430, height: 193, alt: 'Vehicle integration wireframe.', background: 'dark' },
  jeep: { id: 'competitive-jeep', sourceNode: '159:4402', image: '/v2-3/cases/hypnos-cockpit/competitive-jeep.png', width: 528, height: 298, alt: 'Jeep roof-top tent reference.', background: 'dark' },
  liL9: { id: 'competitive-li-l9', sourceNode: '159:4418', image: '/v2-3/cases/hypnos-cockpit/competitive-li-l9.png', width: 1066, height: 526, alt: 'Li L9 reference.', background: 'dark' },
  modelY: { id: 'competitive-model-y', sourceNode: '159:4410', image: '/v2-3/cases/hypnos-cockpit/competitive-model-y.png', width: 814, height: 532, alt: 'Model Y reference.', background: 'dark' },
  dembell: { id: 'competitive-dembell', sourceNode: '159:4426', image: '/v2-3/cases/hypnos-cockpit/competitive-dembell.png', width: 1342, height: 528, alt: 'Dembell reference.', background: 'dark' },
  vwCalifornia: { id: 'competitive-vw-california', sourceNode: '159:4434', image: '/v2-3/cases/hypnos-cockpit/competitive-vw-california.png', width: 818, height: 544, alt: 'VW California reference.', background: 'dark' },
  oura: { id: 'consumer-oura', sourceNode: '159:4480', image: '/v2-3/cases/hypnos-cockpit/consumer-oura.png', width: 564, height: 564, alt: 'Oura Ring reference.', background: 'dark' },
  eightSleep: { id: 'consumer-eight-sleep', sourceNode: '159:4485', image: '/v2-3/cases/hypnos-cockpit/consumer-eight-sleep.png', width: 1006, height: 502, alt: 'Eight Sleep reference.', background: 'dark' },
  airlineSeat: { id: 'consumer-airline-seat', sourceNode: '159:4490', image: '/v2-3/cases/hypnos-cockpit/consumer-airline-seat.png', width: 1200, height: 800, alt: 'Airline business seat reference.', background: 'dark' },
  storyboard: { id: 'sleep-flow-storyboard', sourceNode: '159:4502', image: '/v2-3/cases/hypnos-cockpit/sleep-flow-storyboard.png', width: 1188, height: 390, alt: 'Sleep-flow storyboard.', background: 'dark' },
  drive: { id: 'drive', sourceNode: '159:4555', image: '/v2-3/cases/hypnos-cockpit/drive-mode-cabin.png', width: 1112, height: 626, alt: 'Drive Mode cabin visual.', background: 'dark' },
  rest: { id: 'rest', sourceNode: '159:4563', image: '/v2-3/cases/hypnos-cockpit/rest-mode-cabin.png', width: 1112, height: 626, alt: 'Rest Mode cabin visual.', background: 'dark' },
  seatPlanDrive: { id: 'seat-plan-drive', sourceNode: '159:4571', image: '/v2-3/cases/hypnos-cockpit/seat-plan-drive.png', width: 1080, height: 1920, alt: 'Drive Mode seat plan.', background: 'dark' },
  seatPlanRest: { id: 'seat-plan-rest', sourceNode: '159:4567', image: '/v2-3/cases/hypnos-cockpit/seat-plan-rest.png', width: 1080, height: 1920, alt: 'Rest Mode seat plan.', background: 'dark' },
  beforeCabin: { id: 'before-sleep-cabin', sourceNode: '159:4580', image: '/v2-3/cases/hypnos-cockpit/before-sleep-cabin.png', width: 1024, height: 388, alt: 'Before Sleep cabin state.', background: 'dark' },
  during: { id: 'during', sourceNode: '159:4591', image: '/v2-3/cases/hypnos-cockpit/during-sleep-ui.png', width: 2132, height: 318, alt: 'During Sleep interface.', background: 'dark' },
  mobile: { id: 'mobile-sleep-preparation', sourceNode: '159:4582', image: '/v2-3/cases/hypnos-cockpit/mobile-sleep-preparation.png', width: 164, height: 357, alt: 'Mobile sleep-preparation interface.', background: 'dark' },
  after: { id: 'after', sourceNode: '159:4638', image: '/v2-3/cases/hypnos-cockpit/after-sleep-ui.png', width: 2352, height: 336, alt: 'After Sleep interface.', background: 'dark' },
  satisfaction: { id: 'satisfaction', sourceNode: '159:4646', image: '/v2-3/cases/hypnos-cockpit/satisfaction-chart.png', width: 160, height: 180, alt: 'Average overall satisfaction chart.', background: 'dark' },
  vr: { id: 'roadmap-vr-test', sourceNode: '159:4669', image: '/v2-3/cases/hypnos-cockpit/roadmap-vr-test.png', width: 1024, height: 683, alt: 'VR test visual.', background: 'dark' },
  aiFunction: { id: 'roadmap-ai-function', sourceNode: '159:4670', image: '/v2-3/cases/hypnos-cockpit/roadmap-ai-function.png', width: 1536, height: 1024, alt: 'AI function development visual.', background: 'dark' },
  prototype: { id: 'roadmap-prototype', sourceNode: '159:4671', image: '/v2-3/cases/hypnos-cockpit/roadmap-prototype.png', width: 1024, height: 683, alt: 'One-to-one prototype visual.', background: 'dark' },
} as const satisfies Record<string, HarvardMedia>;

type Chapter = keyof typeof sourceCopy;
const records = (chapter: Chapter, indexes: number[]) => indexes.map(index => sourceCopy[chapter][index]);
const clean = (text: string) => text.replace(/[\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu, '').trim();
const content = (chapter: Chapter, indexes: number[]) => records(chapter, indexes).filter(({ text }) => clean(text)).map(({ text }) => clean(text));
const nodes = (chapter: Chapter, indexes: number[]) => records(chapter, indexes).map(({ nodeId }) => nodeId);
const span = (from: number, to: number) => Array.from({ length: to - from }, (_, index) => from + index);
const item = (chapter: Chapter, titleIndex: number | undefined, bodyIndexes: number[], itemMedia?: HarvardMedia) => ({
  title: titleIndex === undefined ? undefined : clean(sourceCopy[chapter][titleIndex].text),
  body: content(chapter, bodyIndexes),
  media: itemMedia,
  sourceNodes: nodes(chapter, titleIndex === undefined ? bodyIndexes : [titleIndex, ...bodyIndexes]),
});

export const hypnosCockpitCase: HarvardCaseData = {
  slug: 'hypnos-cockpit',
  title: 'Hýpnos Cockpit',
  subtitle: 'An AI-assisted rest cabin concept: exploring how biometric sensing and adaptive controls could shape a more personal sleep-to-wake experience.',
  period: 'Jun. 2024 — May 2025',
  kind: 'AI-assisted cabin concept',
  tags: ['Human–AI Interaction', 'Automotive UI', 'R&D', 'User Journey Mapping'],
  mark: media.mark,
  hero: media.cover,
  coverFrame: '159:4140',
  chapters: [
    {
      id: 'user-insight-problem-framing', sourceFrame: '159:4173', title: 'User Insight & Problem Framing', sections: [
        {
          id: 'insight', title: clean(sourceCopy.userInsight[64].text), body: content('userInsight', [65]), layout: 'cards',
          items: [
            item('userInsight', 66, [67], media.insightChaotic),
            item('userInsight', 68, [69], media.insightMicro),
            item('userInsight', 70, [71], media.insightSanctuary),
          ], sourceNodes: nodes('userInsight', span(64, 72)),
        },
        {
          id: 'why-in-vehicle-sleep', title: clean(sourceCopy.userInsight[13].text), layout: 'grid',
          items: [
            item('userInsight', 1, [2, 9]), item('userInsight', 3, [4, 10]), item('userInsight', 5, [6, 11]), item('userInsight', 7, [8, 12]),
          ], sourceNodes: nodes('userInsight', span(1, 14)),
        },
        {
          id: 'persona-scenarios', title: clean(sourceCopy.userInsight[30].text), body: content('userInsight', [31]), layout: 'cards',
          items: [
            item('userInsight', 14, [15, 16, 17], media.persona), item('userInsight', 27, [26]), item('userInsight', 29, [28]),
          ], sourceNodes: nodes('userInsight', [14, 15, 16, 17, 26, 27, 28, 29, 30, 31]),
        },
        {
          id: 'persona-use-scenarios', layout: 'grid',
          items: [item('userInsight', 18, [19], media.nap), item('userInsight', 20, [21], media.commute), item('userInsight', 22, [23], media.camping), item('userInsight', 24, [25], media.longDrive)],
          sourceNodes: nodes('userInsight', span(18, 26)),
        },
        {
          id: 'problem-definition', title: clean(sourceCopy.userInsight[63].text), body: content('userInsight', [35]), layout: 'comparison',
          items: [item('userInsight', 36, [37, 38, 39]), item('userInsight', 40, [41, 42, 43]), item('userInsight', 44, [45, 46, 47]), item('userInsight', 48, [49, 50, 51])],
          sourceNodes: nodes('userInsight', [...span(35, 52), 63]),
        },
        {
          id: 'core-needs', title: clean(sourceCopy.userInsight[33].text), layout: 'comparison',
          items: [item('userInsight', 52, [53]), item('userInsight', 54, [55])], sourceNodes: nodes('userInsight', [33, 52, 53, 54, 55]),
        },
        {
          id: 'design-strategies', title: clean(sourceCopy.userInsight[34].text), layout: 'comparison',
          items: [item('userInsight', 56, [57]), item('userInsight', 58, [59])], sourceNodes: nodes('userInsight', [34, 56, 57, 58, 59]),
        },
      ],
    },
    {
      id: 'system-blueprint', sourceFrame: '159:4343', title: 'System Blueprint', sections: [
        {
          id: 'interaction-pipeline', title: clean(sourceCopy.systemBlueprint[13].text), layout: 'steps',
          items: [
            item('systemBlueprint', 8, [5, 0], media.pipelineThermal), item('systemBlueprint', 9, [6, 1], media.pipelineSensors), item('systemBlueprint', 10, [2], media.pipelineSeat), item('systemBlueprint', 11, [3], media.pipelinePower), item('systemBlueprint', 12, [7, 4], media.pipelineCabin),
          ], sourceNodes: nodes('systemBlueprint', span(0, 14)),
        },
        {
          id: 'system-integration', title: clean(sourceCopy.systemBlueprint[14].text), layout: 'split',
          items: [item('systemBlueprint', undefined, [15], media.wireframe)], sourceNodes: nodes('systemBlueprint', span(14, 21)),
        },
        {
          id: 'competitive-analysis', title: clean(sourceCopy.systemBlueprint[41].text), layout: 'cards',
          items: [
            item('systemBlueprint', 21, [22, 23], media.jeep), item('systemBlueprint', 24, [26, 25], media.modelY), item('systemBlueprint', 27, [29, 28], media.liL9), item('systemBlueprint', 30, [32, 31], media.dembell), item('systemBlueprint', 33, [35, 34], media.vwCalifornia),
          ], sourceNodes: nodes('systemBlueprint', span(21, 42)),
        },
        {
          id: 'competitive-takeaways', title: clean(sourceCopy.systemBlueprint[42].text), layout: 'grid',
          items: [
            item('systemBlueprint', undefined, [36]), item('systemBlueprint', undefined, [37]), item('systemBlueprint', undefined, [38]), item('systemBlueprint', undefined, [39, 40]),
          ], sourceNodes: nodes('systemBlueprint', span(42, 43)),
        },
        {
          id: 'supporting-technologies', title: clean(sourceCopy.systemBlueprint[50].text), body: content('systemBlueprint', [51]), layout: 'comparison',
          items: [item('systemBlueprint', 43, [44], media.oura), item('systemBlueprint', 45, [46], media.eightSleep), item('systemBlueprint', 47, [48], media.airlineSeat), item('systemBlueprint', undefined, [49])], sourceNodes: nodes('systemBlueprint', span(43, 52)),
        },
      ],
    },
    {
      id: 'sleep-flow-design', sourceFrame: '159:4499', title: 'Sleep Flow & Design', sections: [
        {
          id: 'sleep-flow-timeline', title: clean(sourceCopy.sleepFlow[35].text), body: content('sleepFlow', [26, 27, 28, 29, 31, 32, 33, 34]), layout: 'steps', media: [media.storyboard],
          items: [
            item('sleepFlow', 1, [0, 2, 3]), item('sleepFlow', 5, [4, 6, 7, 8, 9]), item('sleepFlow', 11, [10, 12, 13]), item('sleepFlow', 15, [14, 16, 17]), item('sleepFlow', 19, [18, 20, 21]), item('sleepFlow', 23, [22, 24, 25]),
          ], sourceNodes: nodes('sleepFlow', span(0, 36)),
        },
        {
          id: 'seat-plan-transformation', title: clean(sourceCopy.sleepFlow[44].text), layout: 'comparison',
          items: [item('sleepFlow', 37, [], media.seatPlanDrive), item('sleepFlow', 42, [], media.seatPlanRest)], sourceNodes: nodes('sleepFlow', [37, 42, 43, 44]),
        },
        {
          id: 'vehicle-interior-modes', title: clean(sourceCopy.sleepFlow[36].text), layout: 'comparison',
          items: [item('sleepFlow', 37, [38, 39, 40, 41], media.drive), item('sleepFlow', 42, [43, 44, 45, 46, 47, 48], media.rest)], sourceNodes: nodes('sleepFlow', span(36, 49)),
        },
      ],
    },
    {
      id: 'before-sleep-and-sleep-stage', sourceFrame: '159:4577', title: 'Before Sleep Stage', sections: [
        {
          id: 'sleep-preparation', title: clean(sourceCopy.sleepStage[22].text), layout: 'split',
          items: [item('sleepStage', undefined, [0], media.beforeCabin), item('sleepStage', undefined, [1], media.mobile)], sourceNodes: nodes('sleepStage', [0, 1, 22]),
        },
        {
          id: 'during-sleep-controls', title: clean(sourceCopy.sleepStage[23].text), layout: 'grid', media: [media.during],
          items: [item('sleepStage', 4, [2]), item('sleepStage', 7, [5]), item('sleepStage', 10, [8]), item('sleepStage', 13, [11]), item('sleepStage', 15, [16])], sourceNodes: nodes('sleepStage', span(2, 17).filter(index => ![3, 6, 9, 12, 14].includes(index)).concat([23])),
        },
        {
          id: 'mobile-ui', title: clean(sourceCopy.sleepStage[17].text), layout: 'split',
          items: [item('sleepStage', 21, [18])], sourceNodes: nodes('sleepStage', [17, 18, 19, 20, 21]),
        },
      ],
    },
    {
      id: 'after-sleep-feedback', sourceFrame: '159:4634', title: 'After Sleep Stage', sections: [
        {
          id: 'wake-and-learn', title: clean(sourceCopy.feedback[14].text), layout: 'grid', media: [media.after],
          items: [item('feedback', 15, [16, 17]), item('feedback', 18, [19]), item('feedback', 20, [21])], sourceNodes: nodes('feedback', span(14, 22)),
        },
        {
          id: 'feedback-and-satisfaction', title: clean(sourceCopy.feedback[2].text), layout: 'comparison',
          items: [item('feedback', 3, [4, 5]), item('feedback', 6, [7, 8, 9], media.satisfaction), item('feedback', 10, [11, 12, 13])], sourceNodes: nodes('feedback', span(2, 14)),
        },
        {
          id: 'development-roadmap', title: clean(sourceCopy.feedback[1].text), layout: 'cards',
          items: [item('feedback', 25, [22], media.vr), item('feedback', 26, [23], media.aiFunction), item('feedback', undefined, [24], media.prototype)], sourceNodes: nodes('feedback', [1, ...span(22, 27)]),
        },
      ],
    },
  ],
};
