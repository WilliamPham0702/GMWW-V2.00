(()=>{'use strict';

const VERSION='2.34';
const STATE_KEY='GMWW_V234_STATE';
const PREF_KEY='GMWW_V234_PREFS';
const OLD_STATE_KEYS=['GMWW_V233_STATE','GMWW_V232_STATE','GMWW_V231_STATE','GMWW_V230_STATE','GMWW_V229_STATE','GMWW_V228_STATE','GMWW_V227_STATE','GMWW_V226_STATE','GMWW_V225_STATE','GMWW_V224_STATE','GMWW_V223_STATE','GMWW_V222_STATE','GMWW_V221_STATE','GMWW_V220_STATE','GMWW_V219_STATE','GMWW_V218_STATE','GMWW_V217_STATE','GMWW_V216_STATE','GMWW_V215_STATE','GMWW_V214_STATE','GMWW_V213_STATE','GMWW_V212_STATE','GMWW_V211_STATE','GMWW_V210_STATE','GMWW_V209_STATE','GMWW_V208_STATE','GMWW_V207_STATE','GMWW_V206_STATE','GMWW_V205_STATE'];
const OLD_PREF_KEYS=['GMWW_V233_PREFS','GMWW_V232_PREFS','GMWW_V231_PREFS','GMWW_V230_PREFS','GMWW_V229_PREFS','GMWW_V228_PREFS','GMWW_V227_PREFS','GMWW_V226_PREFS','GMWW_V225_PREFS','GMWW_V224_PREFS','GMWW_V223_PREFS','GMWW_V222_PREFS','GMWW_V221_PREFS','GMWW_V220_PREFS','GMWW_V219_PREFS','GMWW_V218_PREFS','GMWW_V217_PREFS','GMWW_V216_PREFS','GMWW_V215_PREFS','GMWW_V214_PREFS','GMWW_V213_PREFS','GMWW_V212_PREFS','GMWW_V211_PREFS','GMWW_V210_PREFS','GMWW_V209_PREFS','GMWW_V208_PREFS','GMWW_V207_PREFS','GMWW_V206_PREFS','GMWW_V205_PREFS'];
const DB_NAME='GMWW_V208_THEME_ASSETS';
const DB_STORE='assets';

const THEME_UI_GROUPS=[
  {id:'background',title:'🌌 Hình nền',slots:[
    ['bg.home','Nền Trang Chủ'],['bg.deck','Nền Bộ Bài'],['bg.play','Nền Chơi'],['bg.library','Nền Thư Viện'],['bg.settings','Nền Cài Đặt']
  ]},
  {id:'banner',title:'🌄 Banner',slots:[
    ['banner.home','Banner Trang Chủ'],['banner.deck','Banner Bộ Bài'],['banner.play','Banner Chơi'],['banner.library','Banner Thư Viện'],['banner.settings','Banner Cài Đặt'],['banner.dawn','Làng Ơi! Dậy Đi']
  ]},
  {id:'large',title:'🐺 Icon / Hình lớn',slots:[
    ['ui.brandAvatar','Avatar Logo Trên Cùng'],['ui.homeMiniWolf','Avatar Trang Chủ'],['ui.homeStartWolf','Hình Nút Bắt Đầu'],['ui.homeRecentWolf','Hình Ván Gần Đây']
  ]},
  {id:'button',title:'◈ Nút / Điều hướng',slots:[
    ['ui.exploreDeck','Nút Khám Phá • Bộ Bài'],['ui.exploreMembers','Nút Khám Phá • Thành Viên'],['ui.exploreActions','Nút Khám Phá • Hành Động'],['ui.exploreFactions','Nút Khám Phá • Phe Phái'],['ui.exploreLibrary','Nút Khám Phá • Thư Viện'],['ui.exploreSettings','Nút Khám Phá • Cài Đặt'],['ui.bottomNavArt','Hình Thanh Điều Hướng']
  ]},
  {id:'library',title:'🗂 Giao diện Thư Viện',slots:[
    ['ui.libraryHeader','Đầu trang Thư Viện'],['ui.libraryTabs','Nền Tabs Thư Viện'],['ui.cardTile','Nền ô Lá Bài'],['ui.artifactTile','Nền ô ARTIFACTS'],['ui.actionTile','Nền ô Hành Động'],['ui.effectTile','Nền ô Hiệu Ứng'],['ui.themeTile','Nền ô Chủ Đề'],['ui.audioTile','Nền ô Âm Thanh']
  ]},
  {id:'game',title:'🎮 Giao diện Server Game',slots:[
    ['ui.memberPanel','Khung Thành Viên'],['ui.startPanel','Khung Bắt Đầu'],['ui.gamePanel','Khung Điều Khiển Ván'],['ui.nightPanel','Khung Ban Đêm'],['ui.morningPanel','Khung Buổi Sáng'],['ui.summaryPanel','Khung Tổng Kết'],['ui.waitingRoom','Khung Phòng Chờ']
  ]}
];

const DEFAULT_STATE={
  version:VERSION,
  cards:[
    {
      id:'role_old_witch',legacyId:'source-18',name:'Phù Thuỷ Già',factionId:'village',
      information:'Mỗi đêm bạn có thể Đuổi 1 người ra khỏi làng. Tất cả các tác động lên người đó đều không có tác dụng.\n\nHoặc bạn có thể Hồi Sinh 1 người bị chết từ ngày hoặc đêm hôm trước.\n\nMỗi đêm chỉ được chọn sử dụng 1 trong 2 chức năng: Đuổi hoặc Hồi Sinh.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Mỗi đêm chỉ dùng Đuổi hoặc Hồi Sinh, không dùng cả hai.',conditions:'',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[
        {id:'fn_old_witch_exile',actionId:'action_exile',description:'Mỗi đêm Đuổi 1 người ra khỏi làng. Không được Đuổi cùng một người 2 đêm liên tiếp.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_exile']},
        {id:'fn_old_witch_revive',actionId:'action_revive',description:'Hồi Sinh 1 người chết từ ngày hôm trước hoặc đêm hôm trước. Chỉ dùng 1 lần trong ván.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:true,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:true,perUserLimit:0,effectIds:['effect_revive']}
      ]
    },
    {
      id:'role_fairy',legacyId:'source-19',name:'Yêu Tinh',factionId:'village',
      information:'Mỗi đêm bạn thức dậy và di chuyển vết Sói Cắn sang trái hoặc sang phải. Bạn không được biết vết Sói Cắn đang ở đâu. Trường hợp không có vết Sói Cắn, bạn vẫn được gọi dậy và kích hoạt chức năng bình thường nhưng hành động không có tác dụng.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Luôn được gọi dậy mỗi đêm, kể cả khi không có vết Sói Cắn.',attributes:'Không được biết vị trí vết Sói Cắn.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_fairy_transfer',actionId:'action_transfer_bite',description:'Chọn hướng Trái hoặc Phải để dịch chuyển vết Sói Cắn. Nếu không có vết cắn, hành động vẫn ghi nhận nhưng không tạo tác động.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_transfer_bite']}]
    },
    {
      id:'role_assassin',legacyId:'source-20',name:'Sát Thủ',factionId:'third',
      information:'Mỗi đêm bạn được gọi dậy, chọn một người và đánh dấu lên họ Like 👍 hoặc Dislike 👎. Sáng hôm sau, người đó được gọi dậy và chọn dấu của họ. Nếu dấu của họ cùng với bạn, họ sống. Nếu dấu của họ khác với bạn, họ chết.\n\nĐiều kiện thắng: Khi tất cả các Sói và Kẻ Hủy Diệt (nếu có trong ván) chết hết, bạn sẽ thắng.',
      lives:1,flags:{useDay:true,useNight:true,nightImmune:true,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Khi tất cả các Sói và Kẻ Hủy Diệt (nếu có trong ván) chết hết, Sát Thủ thắng.',
      limits:'Mỗi đêm 1 mục tiêu.',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm; người bị tác động chết/Đuổi trong chính đêm vẫn có thể được chọn.',attributes:'Bất tử ban đêm.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_assassin_mark',actionId:'action_assassin_mark',description:'Chọn 1 người và bí mật đánh dấu Like 👍 hoặc Dislike 👎. Sáng hôm sau mục tiêu chọn dấu; cùng dấu sống, khác dấu chết. Nếu mục tiêu đã bị Đuổi trong chính đêm đó, không gọi lại sáng hôm sau và Sát Thủ mất lượt.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_assassin_mark']}]
    },
    {
      id:'role_maiden',legacyId:'source-17',name:'Thiếu Nữ',factionId:'village',
      information:'Mỗi đêm bạn có thể Thăm Nhà một người khác. Nếu mục tiêu là Sói thì bạn chết.\n\nNếu người được thăm bị tác động chết thì bạn cũng chết theo.\n\nNếu bạn không đi Thăm Nhà người khác và bạn bị tác động chết thì bạn cũng chết.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_maiden_visit',actionId:'action_visit_house',description:'Chọn 1 người khác để Thăm Nhà. Nếu mục tiêu là Sói thì Thiếu Nữ chết; nếu người được thăm bị tác động chết trong đêm thì Thiếu Nữ chết theo. Nếu không đi thăm và bị tác động chết thì chết bình thường.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_visit_house']}]
    },
    {
      id:'role_snow_wolf',legacyId:'source-46',name:'Sói Tuyết',factionId:'wolf',
      information:'Mỗi đêm bạn chọn 1 người để Đóng Băng. Người bị Đóng Băng không thể thực hiện chức năng trong đêm đó.\n\nNếu Đóng Băng trúng Sói Trùm, vết Cắn của bầy Sói trong đêm đó không có tác dụng.\n\nBạn không được tham gia Cắn khi bầy Sói còn sống. Bạn chỉ được thực hiện chức năng Cắn khi bầy Sói chỉ còn một mình bạn.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Không Đóng Băng cùng một người 2 đêm liên tiếp.',conditions:'Chức năng Cắn chỉ kích hoạt khi Sói Tuyết là Sói duy nhất còn sống.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[
        {id:'fn_snow_wolf_freeze',actionId:'action_snow_wolf_freeze',description:'Mỗi đêm Đóng Băng 1 người. Nếu trúng Sói Trùm, vết Cắn của Bầy Sói đêm đó không có tác dụng.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:1,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_snow_wolf_freeze']},
        {id:'fn_snow_wolf_bite',actionId:'action_wolf_bite',description:'Chỉ Cắn khi Sói Tuyết là Sói duy nhất còn sống.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,requiresNoOtherLivingWolf:true,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}
      ]
    },
    {
      id:'role_guard',legacyId:'source-4',name:'Bảo Vệ',factionId:'village',
      information:'Mỗi đêm, bạn được chọn một người để bảo vệ họ khỏi vết Sói Cắn.\n\nNgười được bảo vệ sẽ không chết bởi vết Sói Cắn trực tiếp hoặc vết Sói Cắn được dịch chuyển vào họ.\n\nBảo Vệ không có tác dụng trước bình của Phù Thủy hoặc các tác động gây chết khác.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Không được bảo vệ cùng một người hai đêm liên tiếp.',conditions:'',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_guard_protect',actionId:'action_protect',description:'Bảo vệ 1 người khỏi tác động gây chết có nguồn gốc wolf_bite, gồm Cắn trực tiếp và vết Cắn dịch chuyển. Không chặn bình Phù Thủy hay tác động chết khác.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:1,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_protected']}]
    },
    {
      id:'role_alpha_wolf',legacyId:'source-44',name:'Sói Trùm',factionId:'wolf',
      information:'Phe Sói. Sói Trùm tham gia Cắn cùng đàn. Tiên Tri soi Sói Trùm cho kết quả KHÔNG PHẢI SÓI. Nếu Sói Trùm bị Sói Tuyết Đóng Băng, toàn bộ vết Cắn của đàn trong đêm đó bị hủy.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'',attributes:'Tiên Tri soi cho kết quả KHÔNG PHẢI SÓI.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:true,actionId:'action_wolf_bite',scope:'shared',blockOn:['expelled','blocked']},
      functions:[{id:'fn_alpha_wolf_bite',actionId:'action_wolf_bite',description:'Thức dậy cùng Bầy Sói và tham gia Cắn chung.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}]
    },
    {
      id:'role_wolf',legacyId:'source-43',name:'Sói Thường',factionId:'wolf',
      information:'Mỗi đêm, bạn thức dậy cùng Bầy Sói tham gia Cắn.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'action_wolf_bite',scope:'shared',blockOn:[]},
      functions:[{id:'fn_wolf_bite',actionId:'action_wolf_bite',description:'Mỗi đêm thức dậy cùng Bầy Sói và tham gia Cắn. Được chọn bản thân và người cùng Phe; không chọn người đã chết/bị Đuổi từ trước khi đêm bắt đầu.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}]
    }
    ,{id:'role_witch',legacyId:'source-5',name:'Phù Thủy',factionId:'village',information:'Mỗi đêm bạn được gọi dậy và biết người bị Sói cắn. Bạn có 1 bình Cứu và 1 bình Giết. Bình Cứu dùng để cứu người bị Sói cắn; Bình Giết dùng để chọn một người chết. Mỗi bình chỉ được sử dụng 1 lần trong cả ván.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:true,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi bình chỉ dùng 1 lần trong cả ván.',conditions:'Hai bình hoạt động độc lập.',attributes:'Không có thuộc tính đặc biệt.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_witch_save',actionId:'action_witch_save',description:'Cứu người nhận vết Sói cắn cuối cùng.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_witch_save']},{id:'fn_witch_kill',actionId:'action_witch_kill',description:'Chọn 1 người để Giết bằng bình Giết.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_kill']}]},
    {id:'role_hunter',legacyId:'source-3',name:'Thợ Săn',factionId:'village',information:'Bạn nghi ngờ ai là Sói thì hãy đặt thuốc nổ vào nhà họ. Nếu bạn chết, người đó sẽ chết theo. Bạn không thể săn người thuộc Phe Ba.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Không giới hạn số lần sử dụng Săn.',conditions:'Mục tiêu không được là Phe Ba.',attributes:'Khi Thợ Săn chết, mục tiêu đang được Săn chết theo.',passiveRule:{enabled:true,type:'source_death',onDeath:true,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_hunter_hunt',actionId:'action_hunt',description:'Chọn 1 người để đặt thuốc nổ. Nếu Thợ Săn chết, mục tiêu đã Săn chết theo. Không săn được Phe Ba.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'on_actor_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_hunted_death']}]},
    {id:'role_spiritualist',legacyId:'source-31',name:'Nhà Tinh Thần Học',factionId:'village',information:'Bạn là Nhà Tinh Thần Học lỗi lạc của làng. Mỗi đêm, bạn được chọn 2 người để biết họ cùng Phe hay khác Phe. Bạn được sử dụng chức năng tối đa 4 lần trong 5 đêm đầu.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Tối đa 4 lần trong 5 đêm đầu; mỗi đêm tối đa 1 lần.',conditions:'Hai mục tiêu phải khác nhau.',attributes:'So sánh bằng Phe hiện tại / Faction ID chuẩn hóa.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_spiritualist_compare',actionId:'action_compare_faction',description:'Chọn 2 người để kiểm tra Cùng Phe hoặc Khác Phe.',phase:'night',usageMode:'custom',usageCount:4,fromNight:1,toNight:5,cooldownNights:0,targetCount:2,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_compare_faction']}]},
    {id:'role_drunk',legacyId:'source-33',name:'Say Rượu',factionId:'village',information:'Bạn là một bợm nhậu của làng. Vì uống quá chén nên 2 đêm đầu bạn ngủ quên, không thức dậy thực hiện chức năng. Từ Đêm 3, bạn thức dậy đầu tiên và sẽ nhận Lá Vai Trò của một trong những người đã chết. Trường hợp không có người chết, bạn trở thành Dân Làng và không có chức năng.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ kích hoạt 1 lần ở Đêm 3.',conditions:'Đêm 1 và 2 ngủ quên; Đêm 3 thức dậy đầu tiên.',attributes:'Action Say và trạng thái Tỉnh Rượu là hai entity riêng.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_drunk_sober',actionId:'action_drunk_draw',description:'Đêm 3 bốc Lá Vai Trò của một trong những người đã chết. Không có người chết thì trở thành Dân Làng và không có chức năng.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:3,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'night_3_first',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_sober']}]},
    {id:'role_cursed',legacyId:'source-59',name:'Kẻ Bị Nguyền',factionId:'village',information:'Bạn là một người dân lương thiện nhưng bị trúng lời nguyền của một Phù Thủy độc ác. Khi bị Sói cắn, bạn không chết và sẽ trở thành Sói vào đêm tiếp theo. Nếu được Bảo Vệ khỏi vết Sói cắn hoặc được Phù Thủy cứu, lời nguyền không kích hoạt và bạn vẫn là Dân Làng.',lives:1,flags:{useDay:false,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng khi chưa biến đổi; sau khi trở thành Sói Thường thì thắng cùng Phe Sói.',limits:'Không có Action chủ động.',conditions:'Chỉ kích hoạt khi vết Sói cắn có hiệu lực; Bảo Vệ hoặc Phù Thủy cứu thành công thì không kích hoạt.',attributes:'Bị vết Sói cắn có hiệu lực: không chết, sang đêm tiếp theo trở thành Sói Thường.',passiveRule:{enabled:true,type:'source_death',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
    {id:"role_thug",legacyId:"source-thug",name:"Du Côn",factionId:"village",information:"Vào buổi sáng sớm, bạn nghi ngờ ai là Sói hoặc Phe Ba thì lật Lá Vai Trò và Đâm họ. Đúng Phe Sói/Phe Ba: mục tiêu chết; nhầm Dân Làng: bạn chết.",lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Dân Làng.",limits:"Đâm tối đa 1 lần cả ván; sau khi Đâm mất chức năng.",conditions:"",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_thug_stab',actionId:'action_stab',description:'morning_reveal_and_stab',phase:'day',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'morning_reveal_and_stab',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_stab']}]},
    {id:"role_bigfoot",legacyId:"source-bigfoot",name:"Chân To",factionId:"village",information:"Ban đầu bạn thuộc Phe Dân. Nếu ngày đầu tiên không có ai bị treo cổ, bạn trở thành Sói và tham gia Sói Cắn từ đêm tiếp theo.",lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:"Thắng theo Phe hiện tại.",limits:"",conditions:"Chỉ xét ngày đầu; nếu không có ai bị treo cổ, chuyển Vai Trò/Phe thành Sói và tham gia Sói Cắn từ đêm 2.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
    {id:"role_piper",legacyId:"source-62",name:"Kẻ Thổi Sáo",factionId:"village",information:"Trong 3 đêm đầu, mỗi đêm chọn 3 người còn sống; trò chơi cho biết trong nhóm có Sói hay không. Được chọn bản thân.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Dân Làng.",limits:"Mỗi đêm một lần trong 3 đêm đầu.",conditions:"",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_piper_scan',actionId:'action_scan_three',description:'return_contains_wolf_boolean',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:3,cooldownNights:0,targetCount:3,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'return_contains_wolf_boolean',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_scan_three']}]},
    {id:"role_wolf_seer",legacyId:"source-51",name:"Sói Tiên Tri",factionId:"wolf",information:"Mỗi đêm chọn một người còn sống khác bản thân để biết họ có phải Tiên Tri hay không. Không tham gia Sói Cắn cho tới khi là con Sói cuối cùng trong bầy.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Chỉ tham gia Sói Cắn khi là Sói cuối cùng trong bầy.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_seer',actionId:'action_find_seer',description:'return_is_seer_boolean',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'return_is_seer_boolean',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_find_seer']}]},
    {id:"role_wolf_cub",legacyId:"source-49",name:"Sói Con",factionId:"wolf",information:"Bạn là đứa con của Sói Trùm. Nếu bạn chết, đêm hôm sau Bầy Sói được Cắn hai người.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Khi chết, đêm kế tiếp Bầy Sói được Cắn hai mục tiêu; chỉ một đêm.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_cub_bite',actionId:'action_wolf_bite',description:'',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_wolf_bite']}]},
    {id:"role_wolf_hunter",legacyId:"source-54",name:"Sói Thợ Săn",factionId:"wolf",information:"Đêm đầu tiên của ván game, chọn một người còn sống khác bản thân. Nếu bạn chết, người đó chết theo. Nếu mục tiêu chết trước, được chọn lại vào đêm tiếp theo.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Nếu mục tiêu chết trước thì chọn lại đêm tiếp theo.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_hunter_bite',actionId:'action_wolf_bite',description:'',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_wolf_bite']},{id:'fn_wolf_hunter_mark',actionId:'action_hunter_mark',description:'night_one_or_after_marked_target_death',phase:'night',usageMode:'unlimited',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'night_one_or_after_marked_target_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_hunter_mark']}]},
    {id:'role_seer',legacyId:'source-2',name:'Tiên Tri',factionId:'village',information:'Mỗi đêm, bạn được chọn 1 người còn sống khác bản thân để Soi. Kết quả là SÓI hoặc KHÔNG PHẢI SÓI. Sói Trùm là ngoại lệ: Tiên Tri luôn nhận kết quả KHÔNG PHẢI SÓI.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi đêm 1 lần; được chọn lại cùng mục tiêu ở đêm sau.',conditions:'Không chọn bản thân; không chọn người chết.',attributes:'Sói Trùm cho kết quả KHÔNG PHẢI SÓI.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_seer',actionId:'action_seer',description:'Soi 1 người để biết có thuộc Phe Sói hay không.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_seer']}]},
        {id:'role_villager',legacyId:'source-1',name:'Dân Làng',factionId:'village',information:'Bạn là Dân Làng. Bạn không có chức năng đặc biệt.',lives:1,flags:{useDay:false,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Không có Action chủ động.',conditions:'Đêm 1 có thể gọi để xác thực Vai Trò; từ Đêm 2 không gọi dậy và không phát Audio nếu không phát sinh chức năng khác.',attributes:'',passiveRule:{enabled:true,type:'identity_only',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
        {id:'role_destroyer',legacyId:'source-23',name:'Kẻ Huỷ Diệt',factionId:'third',information:'Bạn thuộc Phe Ba và Bất Tử Ban Đêm. Mỗi đêm chỉ được chọn một trong hai chức năng: Soi hoặc Giết. Soi đọc tên Vai Trò của mục tiêu, không đọc Phe. Giết chỉ thành công với Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ hoặc Sát Thủ; chọn sai thì mục tiêu sống và bạn chết.',lives:1,flags:{useDay:false,useNight:true,nightImmune:true,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng khi Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ và Sát Thủ nếu có trong ván đều đã chết. Vai Trò không có trong ván không được tính.',limits:'Mỗi đêm chỉ dùng Soi hoặc Giết, không dùng cả hai.',conditions:'Giết sai khiến Kẻ Huỷ Diệt chết và phản phệ này bỏ qua Bất Tử Ban Đêm.',attributes:'Bất Tử Ban Đêm.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:true,actionId:'destroyer_choice',scope:'self',blockOn:['action_destroyer_scry','action_destroyer_kill']},functions:[{id:'fn_destroyer_scry',actionId:'action_destroyer_scry',description:'Soi 1 người; đọc tên Vai Trò, không đọc Phe.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'choose_one_of_two',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_destroyer_scry']},{id:'fn_destroyer_kill',actionId:'action_destroyer_kill',description:'Giết đúng nhóm Vai Trò mục tiêu; chọn sai thì Kẻ Huỷ Diệt chết.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'choose_one_of_two',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_destroyer_kill']}]},
        {id:'role_clone',legacyId:'source-24',name:'Nhân Bản',factionId:'village',information:'Ban đầu bạn thuộc Phe Dân. Đêm 1 chọn 1 người còn sống khác bản thân. Khi người đó chết bởi bất kỳ lý do nào, bạn giữ tên và Avatar của mình nhưng nhận toàn bộ chức năng của Vai Trò mục tiêu, chuyển sang Phe hiện tại của mục tiêu và từ đó thắng theo Phe mới.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Trước khi kế thừa: thắng cùng Phe Dân Làng. Sau khi kế thừa: thắng theo Phe hiện tại của Vai Trò mục tiêu.',limits:'Chọn đúng 1 mục tiêu ở Đêm 1; không được chọn lại.',conditions:'Mục tiêu phải còn sống, không phải bản thân. Khi kế thừa phải lưu dấu Trước đây: Nhân Bản; Action kế thừa chạy tại Box nguồn của Vai Trò nhận được.',attributes:'Giữ tên và Avatar gốc của Người Chơi.',passiveRule:{enabled:true,type:'target_death_inherit',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_clone_target',actionId:'action_clone_target',description:'Đêm 1 chọn 1 người để liên kết Nhân Bản.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:1,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'night_1',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_clone_watch']}]},
        {id:'role_aura_seer',legacyId:'source-34',name:'Tiên Tri Hào Quang',factionId:'village',information:'Trong 4 đêm đầu tiên, bạn có tổng cộng 2 lần sử dụng chức năng để đọc chức năng của một Người Chơi.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ dùng từ Đêm 1 đến hết Đêm 4; tổng tối đa 2 lần cả ván; mỗi đêm tối đa 1 lần.',conditions:'Chọn 1 Người Chơi; được chọn bản thân; không chọn người chết.',attributes:'Kết quả đọc các chức năng của mục tiêu.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_aura_read',actionId:'action_aura_read',description:'Đọc chức năng của 1 Người Chơi.',phase:'night',usageMode:'nGame',usageCount:2,fromNight:1,toNight:4,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,perNightLimit:1,effectIds:['effect_aura_read']}]},
    {id:'role_knight',legacyId:'source-13',name:'Hiệp Sĩ',factionId:'village',
      information:'Nếu bạn bị chết do treo cổ bạn vẫn chết nhưng sẽ được chọn một người chết vào sáng hôm sau.',
      lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ kích hoạt 1 lần trong cả ván.',conditions:'Chỉ kích hoạt khi Hiệp Sĩ bị vote treo cổ. Trước khi Hiệp Sĩ chết, chọn 1 người còn sống khác bản thân; mục tiêu sẽ chết vào sáng hôm sau.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_knight_last_strike',actionId:'action_knight_last_strike',description:'Khi bị vote treo cổ, trước khi chết chọn 1 người còn sống khác bản thân để chết vào sáng hôm sau.',phase:'day',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'on_lynched_before_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_knight_last_strike']}]},
    {id:'role_fox',legacyId:'source-14',name:'Hồ Ly',factionId:'village',
      information:'Mỗi đêm bạn được chọn 3 người và Quản trò sẽ báo cho bạn biết trong nhóm đó có Sói hay không?',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi đêm chọn đúng 3 người còn sống.',conditions:'Không được chọn bản thân hoặc người chết.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_fox_scan',actionId:'action_fox_scan',description:'Mỗi đêm chọn 3 người còn sống. Trả CÓ SÓI nếu có ít nhất 1 người thuộc Phe Sói, ngược lại trả KHÔNG CÓ SÓI.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:3,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_fox_scan']}]},
    {id:'role_bear_god',legacyId:'source-15',name:'Thần Gấu',factionId:'village',
      information:'Mỗi sáng bạn được chọn 2 người nếu trong 2 người đó có Sói, Quản trò sẽ báo cho bạn biết trong nhóm đó có sói không. Được dùng 2 lần/ ván',
      lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Tối đa 2 lần trong cả ván; mỗi sáng tối đa 1 lần.',conditions:'Chọn 2 người còn sống; không chọn bản thân hoặc người chết.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_bear_scan',actionId:'action_bear_scan',description:'Mỗi sáng chọn 2 người còn sống. Trả CÓ SÓI nếu có ít nhất 1 người thuộc Phe Sói, ngược lại trả KHÔNG CÓ SÓI. Tối đa 2 lần/ván.',phase:'day',usageMode:'nGame',usageCount:2,fromNight:1,toNight:null,cooldownNights:0,targetCount:2,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'morning',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_bear_scan']}]},
    {id:'role_thief',legacyId:'source-16',name:'Kẻ Trộm',factionId:'village',
      information:'Từ đêm 3 được chọn 1 lá Vai Trò trong bộ bài để đổi vai trò hoặc không đổi, khi đổi thì các thông tin chức năng, điều kiện thắng thay đổi theo vai trò mới',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Theo Phe hiện tại sau khi đổi Vai Trò.',limits:'Chỉ được quyết định 1 lần trong cả ván, từ Đêm 3 trở đi.',conditions:'Chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc chọn không đổi.',attributes:'Khi đổi Vai Trò, Phe, chức năng và điều kiện thắng thay đổi theo Vai Trò mới.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_thief_change_role',actionId:'action_thief_change_role',description:'Từ Đêm 3, chọn 1 Lá Vai Trò trong bộ bài để đổi Vai Trò hoặc không đổi. Nếu đổi, nhận Vai Trò, Phe, chức năng và điều kiện thắng của Vai Trò mới.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:null,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'choose_role_card_or_keep',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_thief_change_role']}]}

  ],
  artifacts:[],
  actions:{
    role:[

      {id:'action_seer',legacyId:'9',name:'Soi Xét',description:'Soi 1 người còn sống khác bản thân để nhận kết quả SÓI / KHÔNG PHẢI SÓI; Sói Trùm trả KHÔNG PHẢI SÓI.',effectIds:['effect_seer']},
      {id:'action_destroyer_scry',legacyId:'action-destroyer-scry',name:'Soi Vai Trò',description:'Soi 1 người và đọc tên Vai Trò, không đọc Phe.',effectIds:['effect_destroyer_scry']},
      {id:'action_destroyer_kill',legacyId:'action-destroyer-kill',name:'Giết Mục Tiêu Huỷ Diệt',description:'Giết đúng Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ hoặc Sát Thủ; chọn sai thì nguồn chết.',effectIds:['effect_destroyer_kill']},
      {id:'action_clone_target',legacyId:'action-clone-target',name:'Chọn Người Nhân Bản',description:'Đêm 1 chọn 1 người sống khác bản thân; khi mục tiêu chết thì nhận chức năng và chuyển theo Phe của họ.',effectIds:['effect_clone_watch']},
      {id:'action_aura_read',legacyId:'action-g7-aura-read',name:'Đọc Chức Năng',description:'Trong Đêm 1–4, chọn 1 Người Chơi để đọc các chức năng của họ; tối đa 2 lần/ván và 1 lần/đêm.',effectIds:['effect_aura_read']},
      {id:'action_stab',name:'Đâm',effectIds:['effect_stab']},
      {id:'action_scan_three',name:'Soi Nhóm Ba Người',effectIds:['effect_scan_three']},
      {id:'action_find_seer',name:'Soi Tiên Tri',effectIds:['effect_find_seer']},
      {id:'action_hunter_mark',name:'Đánh Dấu Săn',effectIds:['effect_hunter_mark']},
      {id:'action_exile',legacyId:'1',name:'Đuổi Người',description:'Đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3',effectIds:['effect_exile']},
      {id:'action_revive',legacyId:'2',name:'Hồi Sinh',description:'Hồi Sinh một người chết hợp lệ.',legacyAudioFile:'hoi_sinh.mp3',effectIds:['effect_revive']},
      {id:'action_transfer_bite',legacyId:'6',name:'Dịch Chuyển Vết Cắn',description:'Dịch chuyển vết Sói Cắn sang trái hoặc phải; không có vết cắn vẫn thực hiện nhưng không tạo tác động.',effectIds:['effect_transfer_bite']},
      {id:'action_assassin_mark',legacyId:'12',name:'Đánh Dấu',description:'Đánh dấu bí mật Like/Dislike và giải quyết vào sáng hôm sau.',effectIds:['effect_assassin_mark']},
      {id:'action_visit_house',legacyId:'19',name:'Thăm Nhà',description:'Thiếu Nữ Thăm Nhà một Người Chơi khác trong đêm.',effectIds:['effect_visit_house']},
      {id:'action_snow_wolf_freeze',legacyId:'action-snow-wolf-freeze',name:'Đóng Băng',description:'Đóng Băng chức năng 1 người trong đêm; nếu trúng Sói Trùm thì vô hiệu vết Cắn của Bầy Sói đêm đó.',effectIds:['effect_snow_wolf_freeze']},
      {id:'action_protect',legacyId:'4',name:'Bảo Vệ',description:'Bảo vệ 1 người khỏi tác động chết có nguồn gốc Sói Cắn.',effectIds:['effect_protected']},
      {id:'action_wolf_bite',legacyId:'action-wolf-bite',name:'Sói Cắn',description:'Vết Cắn chung của Bầy Sói.',effectIds:['effect_wolf_bite'],allowFriendlyFaction:true}
      ,{id:'action_witch_save',legacyId:'action-witch-save',name:'Cứu',description:'Cứu người nhận vết Sói cắn cuối cùng; 1 lần trong ván.',effectIds:['effect_witch_save']},{id:'action_witch_kill',legacyId:'action-witch-kill',name:'Giết',description:'Dùng bình Giết lên 1 người; 1 lần trong ván.',effectIds:['effect_kill']},{id:'action_hunt',legacyId:'action-hunt',name:'Săn',description:'Đặt thuốc nổ vào 1 người; khi Thợ Săn chết, mục tiêu chết theo. Không săn được Phe Ba.',effectIds:['effect_hunted_death']},{id:'action_compare_faction',legacyId:'action-compare-faction',name:'So Sánh Phe',description:'Chọn 2 người và trả kết quả Cùng Phe hoặc Khác Phe.',effectIds:['effect_compare_faction']},{id:'action_drunk_draw',legacyId:'action-drunk-draw',name:'Say',description:'Đêm 3 bốc Lá Vai Trò của một trong những người đã chết.',effectIds:['effect_sober']},
      {id:'action_knight_last_strike',legacyId:'action-knight-last-strike',name:'Hiệp Sĩ Chọn Người Chết',description:'Khi Hiệp Sĩ bị vote treo cổ, trước khi chết chọn 1 người còn sống khác bản thân để chết vào sáng hôm sau.',effectIds:['effect_knight_last_strike']},
      {id:'action_fox_scan',legacyId:'7',name:'Hồ Ly Soi Nhóm',description:'Mỗi đêm chọn 3 người còn sống để kiểm tra trong nhóm có Sói hay không.',effectIds:['effect_fox_scan']},
      {id:'action_bear_scan',legacyId:'action-bear-scan',name:'Thần Gấu Soi Nhóm',description:'Mỗi sáng chọn 2 người còn sống để kiểm tra trong nhóm có Sói hay không; tối đa 2 lần/ván.',effectIds:['effect_bear_scan']},
      {id:'action_thief_change_role',legacyId:'16',name:'Kẻ Trộm Đổi Vai Trò',description:'Từ Đêm 3 chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc giữ nguyên; chỉ 1 lần/ván.',effectIds:['effect_thief_change_role']}

    ],
    artifacts:[]
  },
  effects:[

    {id:'effect_seer',name:'Tiên Tri',primitive:'REVEAL_FACTION',duration:'instant',description:'Trả kết quả SÓI / KHÔNG PHẢI SÓI; Sói Trùm luôn trả KHÔNG PHẢI SÓI.',params:{mode:'isWolf',noSelf:true,targetDeathPolicy:'alive_only',falseRoleNames:['Sói Trùm']},webTemplate:{eventType:'seer_result',emoji:'',title:'KẾT QUẢ TIÊN TRI',requireAck:false,requireResponse:false}},
    {id:'effect_destroyer_scry',name:'Soi Vai Trò',primitive:'REVEAL_ROLE',duration:'instant',description:'Hiển thị tên Vai Trò mục tiêu, không hiển thị Phe.',params:{phase:'night',reveal:'role_name_only',noSelf:true,revealRole:true,revealFaction:false},webTemplate:{eventType:'destroyer_scry',emoji:'',title:'KẾT QUẢ SOI',requireAck:false,requireResponse:false}},
    {id:'effect_destroyer_kill',name:'Giết Kẻ Huỷ Diệt',primitive:'KILL',duration:'instant',description:'Chỉ giết nhóm Vai Trò mục tiêu; chọn sai thì Kẻ Huỷ Diệt chết và phản phệ bỏ qua Bất Tử Ban Đêm.',params:{phase:'night',noSelf:true,validRoleNames:['Tiên Tri','Phù Thủy','Thợ Săn','Bảo Vệ','Sát Thủ'],onInvalid:'kill_source',invalidBypassesNightImmune:true,validTargetBypassesNightImmuneRoleNames:['Sát Thủ']},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_clone_watch',name:'Liên Kết Nhân Bản',primitive:'MARK_TARGET',duration:'game',description:'Đêm 1 liên kết 1 mục tiêu; khi mục tiêu chết, Nhân Bản nhận toàn bộ chức năng và Phe hiện tại của mục tiêu.',params:{phase:'night',night:1,noSelf:true,targetAlive:true,oncePerGame:true,persistent:true,onTargetDeath:['COPY_ACTION','CHANGE_FACTION'],copyAllActions:true,factionFromTarget:true,preservePlayerIdentity:true,rememberOriginalRole:'Nhân Bản'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_aura_read',name:'Đọc Chức Năng',primitive:'REVEAL_FUNCTIONS',duration:'instant',description:'Đọc các chức năng của 1 Người Chơi; chỉ hoạt động Đêm 1–4, tối đa 2 lần/ván và 1 lần/đêm.',params:{nightFrom:1,nightTo:4,minTargets:1,maxTargets:1,noSelf:false,targetAlive:true,reveal:'functions'},webTemplate:{eventType:'aura_read',emoji:'',title:'KẾT QUẢ HÀO QUANG',requireAck:false,requireResponse:false}},
    {id:'effect_stab',name:'Đâm',primitive:'CONDITIONAL_KILL',duration:'instant',description:"Nếu mục tiêu thuộc Phe Sói hoặc Phe Ba thì mục tiêu chết, nếu Dân Làng thì Du Côn chết.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_scan_three',name:'Soi Nhóm Ba Người',primitive:'SCAN_GROUP',duration:'instant',description:"Trả kết quả CÓ SÓI / KHÔNG CÓ SÓI trong nhóm ba người.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_find_seer',name:'Soi Tiên Tri',primitive:'CHECK_ROLE',duration:'instant',description:"Trả kết quả PHẢI TIÊN TRI / KHÔNG PHẢI TIÊN TRI.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_hunter_mark',name:'Đánh Dấu Săn',primitive:'DEATH_LINK',duration:'instant',description:"Nếu Sói Thợ Săn chết, mục tiêu đã đánh dấu chết theo.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_exile',name:'Đuổi',primitive:'EXPEL',duration:'nextDay',description:'Đuổi người chơi ra khỏi làng; vô hiệu các tác động lên người bị Đuổi trong thời hạn hiệu lực.',webTemplate:{eventType:'EXPEL',emoji:'🚪',title:'BỊ ĐUỔI KHỎI LÀNG',requireAck:true,requireResponse:false}},
    {id:'effect_revive',name:'Hồi Sinh',primitive:'REVIVE',duration:'instant',description:'Hồi sinh người chơi hợp lệ.',webTemplate:{eventType:'REVIVE',emoji:'✨',title:'ĐƯỢC HỒI SINH',requireAck:false,requireResponse:false}},
    {id:'effect_transfer_bite',name:'Chuyển',primitive:'TRANSFER_EFFECT',duration:'instant',description:'Dịch chuyển tác động wolf_bite theo hướng đã chọn; nếu không có wolf_bite thì không tạo tác động.',params:{scope:'wolf_bite',allowSelf:true,autoSkipWithoutWolfBite:false},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_assassin_mark',name:'Đánh Dấu',primitive:'MARK_TARGET',duration:'nextDay',description:'Lưu dấu Like/Dislike bí mật; sáng hôm sau mục tiêu chọn dấu. Cùng dấu sống, khác dấu chết.',params:{choices:['👍','👎'],resolve:'morning_compare',same:'alive',different:'kill'},webTemplate:{eventType:'ASSASSIN_MARK',emoji:'🎯',title:'BỊ ĐÁNH DẤU',requireAck:false,requireResponse:true}},
    {id:'effect_visit_house',name:'Thăm Nhà',primitive:'MARK_TARGET',duration:'night',description:'Liên kết Thiếu Nữ với người được thăm trong đêm.',params:{dieIfWolf:true,dieIfTargetDies:true,allowConsecutive:true,noSelf:true},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_snow_wolf_freeze',name:'Đóng Băng',primitive:'BLOCK',duration:'night',description:'Chặn chức năng mục tiêu trong đêm; nếu mục tiêu là Sói Trùm thì vô hiệu vết Cắn chung của Bầy Sói đêm đó.',params:{ifTargetRole:'source-44',cancelPackBite:true,noSelf:true,noConsecutiveTarget:true},webTemplate:{eventType:'BLOCK',emoji:'❄️',title:'BẠN BỊ ĐÓNG BĂNG',requireAck:true,requireResponse:false}},
    {id:'effect_protected',name:'Bảo Vệ',primitive:'PROTECT',duration:'night',description:'Chỉ chặn tác động chết có nguồn gốc wolf_bite, kể cả vết Cắn dịch chuyển; không chặn bình Phù Thủy hay tác động chết khác.',params:{scope:'wolf_bite'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_wolf_bite',name:'Sói Cắn',primitive:'KILL',duration:'instant',description:'Tác động Sói Cắn chung của Bầy Sói.',params:{scope:'wolf_bite',sharedPackBite:true},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_witch_save',name:'Cứu',primitive:'BLOCK_DEATH',duration:'night',description:'Chặn cái chết từ vết Sói cắn cuối cùng cho mục tiêu được cứu.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_kill',name:'Chết',primitive:'KILL',duration:'instant',description:'Làm mục tiêu chết.',webTemplate:{eventType:'DEAD',emoji:'💀',title:'ĐÃ CHẾT',requireAck:false,requireResponse:false}},{id:'effect_hunted_death',name:'Săn',primitive:'MARK_TARGET',duration:'game',description:'Ghi nhận mục tiêu Săn; khi Thợ Săn chết, mục tiêu nhận Chết.',params:{trigger:'actor_death',excludeFaction:'third',result:'kill'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_compare_faction',name:'So Sánh Phe',primitive:'COMPARE_FACTION',duration:'instant',description:'So sánh Faction ID hiện tại của 2 mục tiêu và trả Cùng Phe hoặc Khác Phe.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_sober',name:'Tỉnh Rượu',primitive:'ROLE_TRANSITION',duration:'game',description:'Đêm 3 nhận Lá Vai Trò từ một người đã chết; nếu không có người chết thì trở thành Dân Làng không chức năng.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_knight_last_strike',name:'Hiệp Sĩ Chọn Người Chết',primitive:'KILL',duration:'queued',description:'Chỉ khi Hiệp Sĩ bị vote treo cổ: trước khi nguồn chết, chọn 1 mục tiêu còn sống khác bản thân; xử lý mục tiêu chết vào sáng hôm sau.',params:{trigger:'source_lynched',selectBeforeSourceDeath:true,resolveAt:'next_morning',noSelf:true,targetAlive:true,oncePerGame:true},webTemplate:{eventType:'knight_last_strike',emoji:'',title:'HIỆP SĨ',requireAck:false,requireResponse:true}},
    {id:'effect_fox_scan',name:'Hồ Ly Soi Nhóm',primitive:'REVEAL_FACTION_GROUP',duration:'instant',description:'Kiểm tra đúng 3 người còn sống và chỉ trả CÓ SÓI / KHÔNG CÓ SÓI.',params:{minTargets:3,maxTargets:3,noSelf:true,targetAlive:true,mode:'any_wolf',positive:'CÓ SÓI',negative:'KHÔNG CÓ SÓI'},webTemplate:{eventType:'fox_scan',emoji:'',title:'KẾT QUẢ HỒ LY',requireAck:false,requireResponse:false}},
    {id:'effect_bear_scan',name:'Thần Gấu Soi Nhóm',primitive:'REVEAL_FACTION_GROUP',duration:'instant',description:'Mỗi sáng kiểm tra đúng 2 người còn sống và chỉ trả CÓ SÓI / KHÔNG CÓ SÓI; tối đa 2 lần/ván.',params:{phase:'day',timing:'morning',minTargets:2,maxTargets:2,noSelf:true,targetAlive:true,mode:'any_wolf',positive:'CÓ SÓI',negative:'KHÔNG CÓ SÓI',maxUses:2},webTemplate:{eventType:'bear_scan',emoji:'',title:'KẾT QUẢ THẦN GẤU',requireAck:false,requireResponse:false}},
    {id:'effect_thief_change_role',name:'Kẻ Trộm Đổi Vai Trò',primitive:'CHANGE_ROLE_FROM_DECK',duration:'game',description:'Từ Đêm 3, Kẻ Trộm chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc không đổi. Nếu đổi, toàn bộ Vai Trò, Phe, chức năng và điều kiện thắng chuyển theo Vai Trò mới.',params:{fromNight:3,oncePerGame:true,selectionType:'role_card_from_deck',allowKeepCurrent:true,copyRole:true,copyFaction:true,copyFunctions:true,copyWinCondition:true,preservePlayerIdentity:true},webTemplate:{eventType:'thief_change_role',emoji:'',title:'KẺ TRỘM',requireAck:false,requireResponse:true}}

  ],
  audio:{
    cards:[
      {id:'audio_card_role_witch',name:'Phù Thủy',targetId:'role_witch',fileName:'',verifiedBinary:false},{id:'audio_card_role_hunter',name:'Thợ Săn',targetId:'role_hunter',fileName:'',verifiedBinary:false},{id:'audio_card_role_spiritualist',name:'Nhà Tinh Thần Học',targetId:'role_spiritualist',fileName:'',verifiedBinary:false},{id:'audio_card_role_drunk',name:'Say Rượu',targetId:'role_drunk',fileName:'',verifiedBinary:false},{id:'audio_card_role_cursed',name:'Kẻ Bị Nguyền',targetId:'role_cursed',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_fairy',name:'Yêu Tinh',targetId:'role_fairy',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_assassin',name:'Sát Thủ',targetId:'role_assassin',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_maiden',name:'Thiếu Nữ',targetId:'role_maiden',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_snow_wolf',name:'Sói Tuyết',targetId:'role_snow_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_guard',name:'Bảo Vệ',targetId:'role_guard',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_alpha_wolf',name:'Sói Trùm',targetId:'role_alpha_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_wolf',name:'Sói Thường',targetId:'role_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_knight',name:'Hiệp Sĩ',targetId:'role_knight',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_fox',name:'Hồ Ly',targetId:'role_fox',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_bear_god',name:'Thần Gấu',targetId:'role_bear_god',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_thief',name:'Kẻ Trộm',targetId:'role_thief',fileName:'',verifiedBinary:false}
    ],
    artifacts:[],
    actions:[
      {id:'audio_action_witch_save',name:'Cứu',targetId:'action_witch_save',fileName:'',verifiedBinary:false},{id:'audio_action_witch_kill',name:'Giết',targetId:'action_witch_kill',fileName:'',verifiedBinary:false},{id:'audio_action_hunt',name:'Săn',targetId:'action_hunt',fileName:'',verifiedBinary:false},{id:'audio_action_compare_faction',name:'So Sánh Phe',targetId:'action_compare_faction',fileName:'',verifiedBinary:false},{id:'audio_action_drunk_draw',name:'Say',targetId:'action_drunk_draw',fileName:'',verifiedBinary:false},
      {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',fileName:'',verifiedBinary:false},
      {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',fileName:'',verifiedBinary:false},
      {id:'audio_action_transfer_bite',name:'Dịch Chuyển Vết Cắn',targetId:'action_transfer_bite',fileName:'',verifiedBinary:false},
      {id:'audio_action_assassin_mark',name:'Đánh Dấu',targetId:'action_assassin_mark',fileName:'',verifiedBinary:false},
      {id:'audio_action_visit_house',name:'Thăm Nhà',targetId:'action_visit_house',fileName:'',verifiedBinary:false},
      {id:'audio_action_snow_wolf_freeze',name:'Đóng Băng',targetId:'action_snow_wolf_freeze',fileName:'',verifiedBinary:false},
      {id:'audio_action_protect',name:'Bảo Vệ',targetId:'action_protect',fileName:'',verifiedBinary:false},
      {id:'audio_action_wolf_bite',name:'Sói Cắn',targetId:'action_wolf_bite',fileName:'',verifiedBinary:false},
      {id:'audio_action_knight_last_strike',name:'Hiệp Sĩ Chọn Người Chết',targetId:'action_knight_last_strike',fileName:'',verifiedBinary:false},
      {id:'audio_action_fox_scan',name:'Hồ Ly Soi Nhóm',targetId:'action_fox_scan',fileName:'',verifiedBinary:false},
      {id:'audio_action_bear_scan',name:'Thần Gấu Soi Nhóm',targetId:'action_bear_scan',fileName:'',verifiedBinary:false},
      {id:'audio_action_thief_change_role',name:'Kẻ Trộm Đổi Vai Trò',targetId:'action_thief_change_role',fileName:'',verifiedBinary:false}
    ],
    system:[
      {id:'audio_system_confirm',name:'Xác nhận',fileName:'',verifiedBinary:false},
      {id:'audio_system_countdown',name:'Đếm ngược',fileName:'',verifiedBinary:false}
    ]
  },
  themes:{
    activeId:'theme-sea',selectedEditorId:'theme-sea',
    list:[
      {id:'theme-default',name:'Mặc định',builtin:true,locked:true,ui:{},mappings:{}},
      {id:'theme-sea',name:'Biển',builtin:true,locked:false,ui:{},mappings:{}}
    ]
  }
};
const DEFAULT_PREFS={
  cards:{
    role_snow_wolf:{starred:true,starOrder:1,hidden:false},
    role_guard:{starred:true,starOrder:2,hidden:false},
    role_alpha_wolf:{starred:true,starOrder:3,hidden:false},
    role_wolf:{starred:true,starOrder:4,hidden:false},
    role_witch:{starred:true,starOrder:5,hidden:false},
    role_seer:{starred:true,starOrder:6,hidden:false},
    role_hunter:{starred:true,starOrder:7,hidden:false},
    role_villager:{starred:true,starOrder:8,hidden:false},
    role_destroyer:{starred:true,starOrder:9,hidden:false},
    role_clone:{starred:true,starOrder:10,hidden:false},
    role_spiritualist:{starred:true,starOrder:11,hidden:false},
    role_drunk:{starred:true,starOrder:12,hidden:false},
    role_aura_seer:{starred:true,starOrder:13,hidden:false},
    role_cursed:{starred:true,starOrder:14,hidden:false},
    role_thug:{starred:true,starOrder:15,hidden:false},
    role_bigfoot:{starred:true,starOrder:16,hidden:false},
    role_piper:{starred:true,starOrder:17,hidden:false},
    role_wolf_seer:{starred:true,starOrder:18,hidden:false},
    role_wolf_cub:{starred:true,starOrder:19,hidden:false},
    role_wolf_hunter:{starred:true,starOrder:20,hidden:false},
    role_old_witch:{starred:true,starOrder:21,hidden:false},
    role_fairy:{starred:true,starOrder:22,hidden:false},
    role_maiden:{starred:true,starOrder:23,hidden:false},
    role_assassin:{starred:true,starOrder:24,hidden:false},
    role_knight:{starred:true,starOrder:25,hidden:false},
    role_fox:{starred:true,starOrder:26,hidden:false},
    role_bear_god:{starred:true,starOrder:27,hidden:false},
    role_thief:{starred:true,starOrder:28,hidden:false}
  },
  artifacts:{}
}

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatInformation(v){return String(v??'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x?x.charAt(0).toLocaleUpperCase('vi-VN')+x.slice(1):x).join('\n')}
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
function deepMerge(base,raw){if(!raw||typeof raw!=='object')return base;for(const k of Object.keys(raw)){if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k]))deepMerge(base[k],raw[k]);else base[k]=raw[k]}return base}
function normFaction(v){if(v==='wolf'||v==='Sói')return'wolf';if(v==='third'||v==='Phe Ba')return'third';return'village'}
function normalizeFunction(f={}){
  const legacyTo=(f.nightToEnabled===false)?null:(f.nightTo??null);
  const target=Number(f.targetCount??f.maxTargets??f.minTargets??1);
  return{
    id:f.id||uid('fn'),actionId:f.actionId||(f.actionIds&&f.actionIds[0])||'',phase:f.phase||'night',
    usageMode:f.usageMode||f.usage||((f.limitEnabled&&Number(f.perGame)===1)?'onceGame':(f.limitEnabled?'nGame':'unlimited')),
    usageCount:Number(f.usageCount||f.perGame||1),
    fromNight:Number(f.fromNight??(f.nightFromEnabled?f.nightFrom:1)??1),
    toNight:f.toNight!==undefined?f.toNight:legacyTo,
    cooldownNights:Number(f.cooldownNights||0),targetCount:Number.isFinite(target)?Math.max(0,target):1,
    noSelf:f.noSelf!==undefined?!!f.noSelf:(f.selfTarget==='no'),allowDead:!!f.allowDead,noTarget:!!f.noTarget,
    allowConsecutive:f.allowConsecutive!==undefined?!!f.allowConsecutive:(f.allowConsecutive==='yes'),
    passive:!!f.passive,activation:f.activation||f.trigger||'',pushToPlayerWeb:!!f.pushToPlayerWeb,
    targetPreviousCycleOnly:!!f.targetPreviousCycleOnly,perUserLimit:Number(f.perUserLimit||0),
    description:f.description||f.desc||'',
    systemRequired:!!f.systemRequired,usesPackBite:!!f.usesPackBite,requiresNoOtherLivingWolf:!!f.requiresNoOtherLivingWolf,
    actorMayBeDead:!!f.actorMayBeDead,allowFriendlyFaction:!!f.allowFriendlyFaction,replacesWolfBite:!!f.replacesWolfBite,
    effectIds:Array.isArray(f.effectIds)?f.effectIds.slice():[]
  };
}
function normalizeEntity(e,kind){
  const x=clone(e||{});
  x.id=x.id||uid(kind==='cards'?'role':'artifact');x.name=x.name||'Chưa đặt tên';x.information=x.information||x.description||x.desc||'';
  if(kind==='cards')x.factionId=normFaction(x.factionId||x.faction);
  const oldFlags=x.flags||x.systemFlags||x.setup?.systemFlags||{};
  x.lives=Math.max(1,Number(x.lives??oldFlags.lives??1)||1);
  x.flags={
    useDay:!!(oldFlags.useDay??x.useDay),useNight:!!(oldFlags.useNight??x.useNight),
    nightImmune:!!(oldFlags.nightImmune??x.nightImmune),
    allowMultipleActions:!!(oldFlags.allowMultipleActions||oldFlags.multiTask||oldFlags.multiNightActions||x.multiTask||x.multiNightActions),
    passive:!!(oldFlags.passive??x.passive),soloWolfOnly:!!(oldFlags.soloWolfOnly??x.soloWolfOnly)
  };
  x.winCondition=x.winCondition||'';
  x.passiveRule=Object.assign({enabled:false,type:'stake_survive',firstTime:'',nextTime:'',onDeath:false,skipIfTargetAlreadyDead:false},x.passiveRule||{},x.passiveRules||{});
  x.groupActionGate=Object.assign({enabled:false,actionId:'',scope:'self',blockOn:[]},x.groupActionGate||{},Array.isArray(x.groupActionGates)&&x.groupActionGates[0]||{});
  x.specialRules=Object.assign({systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false},x.specialRules||{});
  x.limits=x.limits||x.setup?.limits||'';
  x.conditions=x.conditions||x.setup?.conditions||'';
  x.attributes=x.attributes||x.setup?.attributes||'';
  const fs=x.functions||x.abilities||[];
  x.functions=fs.map(normalizeFunction);
  if(kind==='artifacts')x.artifact=Object.assign({ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''},x.artifact||{});
  return x;
}
function migrateOld(raw){
  const s=clone(DEFAULT_STATE);if(!raw)return s;
  if(Array.isArray(raw.cards)&&raw.cards.length)s.cards=raw.cards.map(x=>normalizeEntity(x,'cards'));
  if(Array.isArray(raw.artifacts)&&raw.artifacts.length)s.artifacts=raw.artifacts.map(x=>normalizeEntity(x,'artifacts'));
  else if(Array.isArray(raw.atifats)&&raw.atifats.length)s.artifacts=raw.atifats.map(x=>normalizeEntity(x,'artifacts'));
  if(raw.actions){if(Array.isArray(raw.actions.role))s.actions.role=raw.actions.role.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}));const aa=raw.actions.artifacts||raw.actions.artifact;if(Array.isArray(aa))s.actions.artifacts=aa.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}))}
  if(Array.isArray(raw.effects))s.effects=raw.effects.map(e=>({id:e.id,name:e.name,primitive:e.primitive||e.type||'CUSTOM',duration:e.duration||'instant',description:e.description||e.desc||'',webTemplate:e.webTemplate||e.webInteraction||{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}}));
  if(raw.audio){
    if(Array.isArray(raw.audio)){for(const a of raw.audio){const scope=String(a.scope||'').toLowerCase();const k=scope.includes('artifact')?'artifacts':scope.includes('action')?'actions':scope.includes('system')?'system':'cards';s.audio[k].push(a)}}
    else if(typeof raw.audio==='object')s.audio=deepMerge(s.audio,raw.audio);
  }
  if(raw.themes)s.themes=deepMerge(s.themes,raw.themes);
  s.version=VERSION;return s;
}
function applyV210Rules(s){
  const witch=(s.cards||[]).find(x=>x.id==='role_old_witch'||x.legacyId==='source-18');
  if(witch){
    const oldInfo='Phe Dân. Mỗi đêm chọn Đuổi 1 người hoặc Hồi Sinh 1 người, không được làm cả hai. Hồi Sinh chỉ áp dụng cho người chết ở ngày trước hoặc đêm trước theo luật.';
    if(!witch.information||witch.information===oldInfo)witch.information=DEFAULT_STATE.cards[0].information;
    const exile=(witch.functions||[]).find(f=>f.id==='fn_old_witch_exile'||f.actionId==='action_exile'||String(f.actionId)==='1');
    if(exile){if(!String(exile.description||'').trim())exile.description=DEFAULT_STATE.cards[0].functions[0].description;exile.phase='night';exile.usageMode='eachNight';exile.usageCount=1;exile.targetCount=1;exile.noSelf=true;exile.allowDead=false;exile.allowConsecutive=false;exile.pushToPlayerWeb=true}
    const revive=(witch.functions||[]).find(f=>f.id==='fn_old_witch_revive'||f.actionId==='action_revive'||String(f.actionId)==='2');
    if(revive){if(!String(revive.description||'').trim())revive.description=DEFAULT_STATE.cards[0].functions[1].description;revive.phase='night';revive.usageMode='onceGame';revive.usageCount=1;revive.targetCount=1;revive.noSelf=true;revive.allowDead=true;revive.allowConsecutive=false;revive.pushToPlayerWeb=true;revive.targetPreviousCycleOnly=true}
  }
  const cardAudio=(s.audio&&s.audio.cards)||[];
  const witchAudio=cardAudio.filter(a=>a.targetId==='role_old_witch'||a.sourceKey==='ROLE:source-18'||a.name==='Phù Thuỷ Già');
  const keepCard=witchAudio[0]||{};
  Object.assign(keepCard,{id:'audio_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',sourceKey:'ROLE:source-18',fileName:'Phù Thuỷ Già.mp3',verifiedBinary:true});
  s.audio.cards=[keepCard,...cardAudio.filter(a=>!witchAudio.includes(a))];

  const actionAudio=(s.audio&&s.audio.actions)||[];
  const canonicalActions=[
    {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',sourceKey:'ACTION:1',fileName:'duoi_nguoi.mp3',verifiedBinary:false},
    {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',sourceKey:'ACTION:2',fileName:'hoi_sinh.mp3',verifiedBinary:false}
  ];
  const otherActions=actionAudio.filter(a=>!canonicalActions.some(c=>a.id===c.id||a.targetId===c.targetId||a.sourceKey===c.sourceKey||a.name===c.name));
  s.audio.actions=[...canonicalActions,...otherActions];

  const currentCards=s.audio.cards||[];
  const wolfCandidates=currentCards.filter(a=>a.id==='audio_group_wolves'||a.sourceKey==='GROUP:WOLVES'||a.name==='Bầy Sói'||a.name==='Sói thức dậy');
  const wolfKeep=wolfCandidates[0]||{};
  Object.assign(wolfKeep,{id:'audio_group_wolves',name:'Bầy Sói',targetGroup:'wolves',sourceKey:'GROUP:WOLVES',fileName:'gmww-wolf-pack.m4a',verifiedBinary:true});
  s.audio.cards=[...s.audio.cards.filter(a=>!wolfCandidates.includes(a)),wolfKeep];

  const systemAudio=(s.audio&&s.audio.system)||[];
  const canonicalSystem=[
    {id:'audio_system_confirm',name:'Xác nhận',sourceKey:'SYSTEM:CONFIRM_TARGET',fileName:'gmww-confirm.m4a',verifiedBinary:true},
    {id:'audio_system_countdown',name:'Đếm ngược',sourceKey:'SYSTEM:DAY_COUNTDOWN_30',fileName:'gmww-countdown-30.m4a',verifiedBinary:true}
  ];
  const systemAliases=new Set(['audio_system_wolf','Sói thức dậy']);
  const otherSystem=systemAudio.filter(a=>!canonicalSystem.some(c=>a.id===c.id||a.sourceKey===c.sourceKey||a.name===c.name)&&!systemAliases.has(a.id)&&!systemAliases.has(a.name));
  s.audio.system=[...canonicalSystem,...otherSystem];

  const exileAction=(s.actions?.role||[]).find(a=>a.id==='action_exile'||String(a.legacyId)==='1');
  if(exileAction)Object.assign(exileAction,{legacyId:'1',name:'Đuổi Người',description:'Bà phù thủy già đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3'});
  const reviveAction=(s.actions?.role||[]).find(a=>a.id==='action_revive'||String(a.legacyId)==='2');
  if(reviveAction)Object.assign(reviveAction,{legacyId:'2',name:'Hồi Sinh',description:'Cứu sống một người đã chết.',legacyAudioFile:'hoi_sinh.mp3'});
  return s;
}
function applyV226Catalog(s,migrating=false){
  const upsert=(arr,item,keys=['id'])=>{
    arr=Array.isArray(arr)?arr:[];
    if(!item||typeof item!=='object')return arr;
    const idx=arr.findIndex(x=>keys.some(k=>item[k]&&x&&x[k]===item[k]));
    if(idx>=0)arr[idx]=Object.assign({},arr[idx],clone(item));else arr.push(clone(item));
    return arr;
  };
  for(const c of DEFAULT_STATE.cards)s.cards=upsert(s.cards,c,['id','legacyId']);
  s.artifacts=Array.isArray(s.artifacts)?s.artifacts:[];
  s.actions=s.actions||{role:[],artifacts:[]};
  for(const a of DEFAULT_STATE.actions.role)s.actions.role=upsert(s.actions.role,a,['id','legacyId']);
  s.actions.artifacts=Array.isArray(s.actions.artifacts)?s.actions.artifacts:[];
  s.effects=Array.isArray(s.effects)?s.effects:[];
  for(const e of DEFAULT_STATE.effects)s.effects=upsert(s.effects,e,['id']);
  s.audio=s.audio||{cards:[],artifacts:[],actions:[],system:[]};
  for(const k of ['cards','artifacts','actions','system'])s.audio[k]=Array.isArray(s.audio[k])?s.audio[k]:[];

  if(migrating){
    const removedArtifacts=new Set(['artifact_mirror','artifact_role_swap','artifact_wake_with_seer']);
    const removedArtifactLegacy=new Set(['atifat-1789042413093','atifat-1789042448651','atifat-wake-with-seer']);
    s.artifacts=s.artifacts.filter(x=>!removedArtifacts.has(x.id)&&!removedArtifactLegacy.has(x.legacyId));
    const removedArtifactActions=new Set(['action_mirror','action_role_swap','action_wake_with_seer']);
    s.actions.artifacts=s.actions.artifacts.filter(x=>!removedArtifactActions.has(x.id));
    const removedEffects=new Set(['effect_copy_functions','effect_swap_roles']);
    s.effects=s.effects.filter(x=>!removedEffects.has(x.id));
    s.audio.artifacts=s.audio.artifacts.filter(x=>!removedArtifacts.has(x.targetId));
    s.audio.cards=s.audio.cards.filter(x=>x.id!=='audio_group_wolves'&&x.sourceKey!=='GROUP:WOLVES'&&x.targetGroup!=='wolves');
    for(const t of (s.themes?.list||[]))t.mappings={};
  }

  const syncAudio=(kind,target,idPrefix)=>{
    const list=s.audio[kind];
    let a=list.find(x=>x.targetId===target.id);
    if(!a){a={id:idPrefix+target.id,name:target.name,targetId:target.id,fileName:'',verifiedBinary:false};list.push(a)}
    if(migrating){a.name=target.name;a.fileName='';a.verifiedBinary=false;delete a.sourceKey;delete a.url}
  };
  for(const c of s.cards)syncAudio('cards',c,'audio_card_');
  for(const a of s.actions.role)syncAudio('actions',a,'audio_action_');
  if(!s.audio.system.some(x=>x.id==='audio_system_confirm'))s.audio.system.push({id:'audio_system_confirm',name:'Xác nhận',fileName:'',verifiedBinary:false});
  if(!s.audio.system.some(x=>x.id==='audio_system_countdown'))s.audio.system.push({id:'audio_system_countdown',name:'Đếm ngược',fileName:'',verifiedBinary:false});
  if(migrating)for(const a of s.audio.system){a.fileName='';a.verifiedBinary=false;delete a.sourceKey;delete a.url}
  s.version=VERSION;
  return s;
}
function applyV226Prefs(p,migrating=false){
  p=p||{cards:{},artifacts:{}};
  p.cards=Object.assign({},DEFAULT_PREFS.cards,p.cards||{});
  p.artifacts=Object.assign({},p.artifacts||{});
  if(migrating)for(const id of ['artifact_mirror','artifact_role_swap','artifact_wake_with_seer'])delete p.artifacts[id];
  return p;
}

function loadState(){
  try{const cur=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(cur){const s=deepMerge(clone(DEFAULT_STATE),cur);s.cards=s.cards.map(x=>normalizeEntity(x,'cards'));s.artifacts=s.artifacts.map(x=>normalizeEntity(x,'artifacts'));return applyV226Catalog(applyV210Rules(s),false)}}catch(_){}
  for(const k of OLD_STATE_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const s=applyV226Catalog(applyV210Rules(migrateOld(raw)),true);localStorage.setItem(STATE_KEY,JSON.stringify(s));return s}}catch(_){}}
  return applyV226Catalog(clone(DEFAULT_STATE),false);
}
function loadPrefs(){
  try{const cur=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(cur)return applyV226Prefs(deepMerge(clone(DEFAULT_PREFS),cur),false)}catch(_){}
  for(const k of OLD_PREF_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const p=clone(DEFAULT_PREFS);if(raw.cards)p.cards=raw.cards;if(raw.artifacts)p.artifacts=raw.artifacts;const out=applyV226Prefs(p,true);localStorage.setItem(PREF_KEY,JSON.stringify(out));return out}}catch(_){}}
  return applyV226Prefs(clone(DEFAULT_PREFS),false);
}

function applyV221AudioGuard(s){
  const keep='ROLE:source-18';
  for(const kind of ['cards','artifacts','actions','system'])for(const a of (s.audio?.[kind]||[])){
    if(a.sourceKey&&a.sourceKey!==keep){delete a.sourceKey;a.verifiedBinary=false}
  }
  return s;
}
let state=loadState(),prefs=loadPrefs();
saveState();
let currentKind='cards',currentId='role_old_witch',editDraft=null,cardFilter='all',artifactFilter='all',actionKind='role',audioKind='cards',editContext=null,lastTouchMap=new WeakMap(),defaultThumb='',objectUrls=new Map();

function saveState(){state.version=VERSION;localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function entityList(kind){return kind==='artifacts'?state.artifacts:state.cards}
function entityById(kind,id){return entityList(kind).find(x=>x.id===id)||null}
function actionList(kind){return kind==='artifacts'?state.actions.artifacts:state.actions.role}
function actionById(id){return [...state.actions.role,...state.actions.artifacts].find(x=>String(x.id)===String(id))||null}
function effectById(id){return state.effects.find(x=>String(x.id)===String(id))||null}
function prefFor(kind,id){prefs[kind]=prefs[kind]||{};prefs[kind][id]=prefs[kind][id]||{starred:false,starOrder:null,hidden:false};return prefs[kind][id]}
function factionMeta(id){if(id==='wolf')return{id:'wolf',label:'Phe Sói',icon:'🐾'};if(id==='third')return{id:'third',label:'Phe Ba',icon:'🔥'};return{id:'village',label:'Phe Dân Làng',icon:'🍃'}}
function selectOptions(items,selected){return items.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+esc(l)+'</option>').join('')}
function numOptions(min,max,selected){const a=[];for(let i=min;i<=max;i++)a.push([String(i),String(i)]);return selectOptions(a,String(selected))}
function themeById(id){return state.themes.list.find(x=>x.id===id)||state.themes.list[0]}

function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DB_STORE))q.result.createObjectStore(DB_STORE,{keyPath:'key'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function dbPut(key,blob){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({key,blob,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function dbGet(key){const db=await openDb();const out=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const q=tx.objectStore(DB_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)});db.close();return out}
async function dbDelete(key){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
function cardBlobKey(themeId,kind,id,assetKind){return 'v225|'+themeId+'|'+kind+'|'+id+'|'+assetKind}
function uiBlobKey(themeId,slotId){return themeId+'|ui|'+slotId}
async function blobUrlFor(key){if(objectUrls.has(key))return objectUrls.get(key);try{const rec=await dbGet(key);if(rec&&rec.blob){const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u}}catch(_){}return''}
function imageToThumb(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=360;c.height=330;const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,360,330);const sw=im.naturalWidth||1024,sh=im.naturalHeight||936,scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(360-dw)/2,(330-dh)/2,dw,dh);resolve(c.toDataURL('image/webp',.82))};im.onerror=()=>resolve(src);im.src=src})}
async function ensureDefaultThumb(){if(defaultThumb)return defaultThumb;defaultThumb='default-artwork.webp';return defaultThumb}
async function resolveArtwork(kind,id,assetKind){
  const active=state.themes.activeId||'theme-sea';
  if(active!=='theme-default'){
    const local=await blobUrlFor(cardBlobKey(active,kind,id,assetKind));if(local)return local;
    if(assetKind==='thumb'){
      const displayLocal=await blobUrlFor(cardBlobKey(active,kind,id,'display'));if(displayLocal)return displayLocal;
    }
  }
  if(assetKind==='thumb')return await ensureDefaultThumb();
  return 'default-artwork.webp';
}

async function resolveUiSlot(themeId,slotId){const local=await blobUrlFor(uiBlobKey(themeId,slotId));if(local)return local;const t=themeById(themeId),u=String(t.ui?.[slotId]?.url||'').trim();return u}
async function applyActiveThemeUi(){
  const id=state.themes.activeId||'theme-sea';
  const map={'bg.home':'#home','bg.play':'#start','bg.library':'#library','bg.settings':'#settings'};
  for(const [slot,sel] of Object.entries(map)){const el=$(sel);if(!el)continue;const src=await resolveUiSlot(id,slot);if(src){el.style.backgroundImage='linear-gradient(rgba(3,12,21,.50),rgba(3,12,21,.70)),url("'+src.replace(/"/g,'\"')+'")';el.style.backgroundSize='cover';el.style.backgroundPosition='center'}else{el.style.backgroundImage=''}}
}

function entityTileHtml(kind,e){
  const p=prefFor(kind,e.id),sub=kind==='cards'?(factionMeta(e.factionId).icon+' '+factionMeta(e.factionId).label):'✦ ARTIFACTS';
  return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-kind="'+kind+'" data-id="'+esc(e.id)+'"><div class="tile-actions"><button class="hide '+(p.hidden?'on':'')+'" data-pref="hide">'+(p.hidden?'HIỆN':'ẨN')+'</button><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button></div><img data-thumb-kind="'+kind+'" data-thumb-id="'+esc(e.id)+'" alt=""><h3>'+esc(e.name)+'</h3><small>'+esc(sub)+(p.hidden?' • Tạm ẩn':'')+'</small></article>'
}
function bindEntityTiles(kind,root,list){
  list.forEach(async e=>{const im=$('[data-thumb-kind="'+kind+'"][data-thumb-id="'+CSS.escape(e.id)+'"]',root);if(im)im.src=await resolveArtwork(kind,e.id,'thumb')});
  Array.from(root.querySelectorAll('[data-kind="'+kind+'"][data-id]')).forEach(tile=>tile.onclick=ev=>{const pref=ev.target.closest('[data-pref]');if(pref){ev.stopPropagation();togglePref(kind,tile.dataset.id,pref.dataset.pref);return}openEntityEditor(kind,tile.dataset.id)});
}
function ensureAudioPlaceholder(kind,target){
  const bucket=kind==='cards'?'cards':kind==='artifacts'?'artifacts':'actions';
  state.audio[bucket]=state.audio[bucket]||[];
  let a=state.audio[bucket].find(x=>x.targetId===target.id);
  if(!a){a={id:uid('audio'),name:target.name,targetId:target.id,fileName:'',verifiedBinary:false};state.audio[bucket].push(a)}else a.name=target.name;
  return a;
}
function createEntity(kind){
  const isCard=kind==='cards',id=uid(isCard?'role':'artifact');
  const raw={id,name:isCard?'Lá Bài Mới':'ARTIFACT Mới',information:'',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]};
  if(isCard)raw.factionId='village';else raw.artifact={ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''};
  const e=normalizeEntity(raw,kind);entityList(kind).unshift(e);prefFor(kind,id);ensureAudioPlaceholder(kind,e);saveState();savePrefs();renderEntityGrid(kind);openEntityEditor(kind,id);
}
function renderEntityGrid(kind){
  const grid=$(kind==='cards'?'#cardGrid':'#artifactGrid'),favGrid=$(kind==='cards'?'#cardFavoriteGrid':'#artifactFavoriteGrid'),filter=kind==='cards'?cardFilter:artifactFilter;
  const all=entityList(kind);
  const favorites=all.filter(e=>{const p=prefFor(kind,e.id);return p.starred&&!p.hidden}).sort((a,b)=>(prefFor(kind,a.id).starOrder||999999)-(prefFor(kind,b.id).starOrder||999999));
  favGrid.innerHTML=favorites.length?favorites.map(e=>entityTileHtml(kind,e)).join(''):'<div class="favorite-empty">Chưa có Lá được đánh ★</div>';
  if(favorites.length)bindEntityTiles(kind,favGrid,favorites);
  let list=all.filter(e=>{const p=prefFor(kind,e.id);if(filter==='hidden')return p.hidden;return !p.hidden&&!p.starred});
  list.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
  const add='<button class="role-tile entity-add-tile" data-add-entity="'+kind+'" aria-label="Thêm"><span>＋</span><b>'+(kind==='cards'?'Thêm Lá Bài':'Thêm ARTIFACT')+'</b></button>';
  grid.innerHTML=add+list.map(e=>entityTileHtml(kind,e)).join('');
  bindEntityTiles(kind,grid,list);
  const addBtn=$('[data-add-entity="'+kind+'"]',grid);if(addBtn)addBtn.onclick=()=>createEntity(kind);
}

function togglePref(kind,id,type){const p=prefFor(kind,id);if(type==='star'){if(p.starred){p.starred=false;p.starOrder=null}else{p.hidden=false;p.starred=true;const orders=Object.values(prefs[kind]||{}).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);p.starOrder=Math.max(0,...orders)+1}}else{p.hidden=!p.hidden;if(p.hidden){p.starred=false;p.starOrder=null}}savePrefs();renderEntityGrid(kind)}

async function renderEntityFront(){
  const e=editDraft;if(!e)return;const card=$('#playerCard'),badge=$('#playerFactionBadge');
  card.className='player-card '+(currentKind==='artifacts'?'artifact':(e.factionId||'village'));
  $('#playerName').textContent=(e.name||'').toUpperCase();
  if(currentKind==='cards'){const f=factionMeta(e.factionId);badge.textContent=f.icon+' '+f.label}else badge.textContent='✦ ARTIFACTS';
  $('#playerInformation').textContent=formatInformation(e.information||'');
  $('#playerDisplay').src=await resolveArtwork(currentKind,e.id,'display');
}
function actionOptions(selected){const k=currentKind==='artifacts'?'artifacts':'role';return actionList(k).map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(selected)?'selected':'')+'>'+esc(a.name)+'</option>').join('')}
function functionHtml(fn,index){
  const to=fn.toNight===null||fn.toNight===''?'end':String(fn.toNight);
  return '<div class="function-card" data-fn-index="'+index+'"><div class="function-head"><b>Hành Động #'+(index+1)+'</b><button data-remove-fn="'+index+'" aria-label="Xoá">×</button></div>'+
    '<div class="function-grid">'+
      '<label class="full">Hành Động<select data-f="actionId">'+actionOptions(fn.actionId)+'</select></label>'+
      '<label class="full">Mô tả riêng trên Lá<textarea class="function-description" data-t="description">'+esc(fn.description||'')+'</textarea></label>'+
      '<label>Phase<select data-f="phase">'+selectOptions([['night','Ban Đêm'],['day','Ban Ngày'],['setup','Đầu Ván / Setup'],['trigger','Theo sự kiện']],fn.phase||'night')+'</select></label>'+
      '<label>Giới hạn sử dụng<select data-f="usageMode">'+selectOptions([['unlimited','Không giới hạn'],['eachNight','Mỗi đêm'],['eachDay','Mỗi ngày'],['onceGame','1 lần / ván'],['nGame','N lần / ván'],['nPerNight','N lần / đêm']],fn.usageMode||'unlimited')+'</select></label>'+
      '<label>Số lần<select data-f="usageCount">'+numOptions(1,10,fn.usageCount||1)+'</select></label>'+
      '<label>Cooldown (đêm)<select data-f="cooldownNights">'+numOptions(0,10,fn.cooldownNights||0)+'</select></label>'+
      '<label>Số mục tiêu<select data-f="targetCount">'+numOptions(0,8,fn.targetCount??1)+'</select></label>'+
      '<label>Giới hạn mỗi người<select data-f="perUserLimit">'+numOptions(0,5,fn.perUserLimit||0)+'</select></label>'+
      '<div class="range-row"><label>Từ đêm<select data-f="fromNight">'+numOptions(1,20,fn.fromNight||1)+'</select></label><label>Đến đêm<select data-f="toNight"><option value="end" '+(to==='end'?'selected':'')+'>Hết ván</option>'+numOptions(1,20,to)+'</select></label></div>'+
      '<label class="full">Kích hoạt khi<select data-f="activation">'+selectOptions([['','Chủ động / Theo lượt'],['stake_execution','Bị Treo Cổ'],['SOURCE_DEATH','Nguồn chết'],['morning','Buổi sáng'],['night_start','Bắt đầu đêm'],['day_start','Bắt đầu ngày']],fn.activation||'')+'</select></label>'+
    '</div>'+
    '<div class="function-checks">'+
      checkHtml('noSelf','Không được chọn bản thân',fn.noSelf)+
      checkHtml('allowDead','Cho phép chọn người đã chết',fn.allowDead)+
      checkHtml('noTarget','Không cần chọn mục tiêu',fn.noTarget)+
      checkHtml('allowConsecutive','Cho phép chọn cùng mục tiêu liên tiếp',fn.allowConsecutive)+
      checkHtml('passive','Hành Động thụ động',fn.passive)+
      checkHtml('targetPreviousCycleOnly','Chỉ mục tiêu chu kỳ trước',fn.targetPreviousCycleOnly)+
      checkHtml('pushToPlayerWeb','Đẩy xuống Player Web',fn.pushToPlayerWeb)+
      checkHtml('systemRequired','Yêu cầu Hệ Thống',fn.systemRequired)+
      checkHtml('usesPackBite','Dùng Sói Cắn chung',fn.usesPackBite)+
      checkHtml('requiresNoOtherLivingWolf','Chỉ khi không còn Sói khác sống',fn.requiresNoOtherLivingWolf)+
      checkHtml('actorMayBeDead','Người thực hiện có thể đã chết',fn.actorMayBeDead)+
      checkHtml('allowFriendlyFaction','Cho phép chọn cùng Phe',fn.allowFriendlyFaction)+
      checkHtml('replacesWolfBite','Thay thế Sói Cắn',fn.replacesWolfBite)+
    '</div></div>';
}
function checkHtml(key,label,checked){return '<label class="check"><input type="checkbox" data-b="'+key+'" '+(checked?'checked':'')+'><span>'+esc(label)+'</span></label>'}
function renderEntityBack(){
  const e=editDraft;if(!e)return;
  $('#entitySettingsTitle').textContent=currentKind==='cards'?'Cài đặt Lá Bài':'Cài đặt ARTIFACTS';
  $('#entityName').value=e.name||'';$('#entityInformation').value=e.information||'';
  $('#factionBlock').classList.toggle('hidden',currentKind!=='cards');$('#livesField').classList.toggle('hidden',currentKind!=='cards');
  if(currentKind==='cards')$$('#factionSeg button').forEach(b=>b.classList.toggle('active',b.dataset.faction===e.factionId));
  $('#entityLives').value=Math.max(1,Number(e.lives||1));
  const f=e.flags||{};$('#flagUseDay').checked=!!f.useDay;$('#flagUseNight').checked=!!f.useNight;$('#flagNightImmune').checked=!!f.nightImmune;$('#flagAllowMultipleActions').checked=!!f.allowMultipleActions;$('#flagPassive').checked=!!f.passive;$('#flagSoloWolfOnly').checked=!!f.soloWolfOnly;$('#winCondition').value=e.winCondition||'';
  $('#passiveRuleEnabled').checked=!!e.passiveRule?.enabled;$('#passiveRuleType').value=e.passiveRule?.type||'stake_survive';
  $('#passiveFirstTime').value=e.passiveRule?.firstTime||'';$('#passiveNextTime').value=e.passiveRule?.nextTime||'';$('#passiveOnDeath').checked=!!e.passiveRule?.onDeath;$('#passiveSkipDead').checked=!!e.passiveRule?.skipIfTargetAlreadyDead;
  $('#groupGateEnabled').checked=!!e.groupActionGate?.enabled;$('#groupGateAction').innerHTML='<option value="">Chọn Hành Động</option>'+actionList(currentKind==='artifacts'?'artifacts':'role').map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(e.groupActionGate?.actionId)?'selected':'')+'>'+esc(a.name)+'</option>').join('');
  $('#groupGateScope').value=e.groupActionGate?.scope||'self';$('#gateExpelled').checked=(e.groupActionGate?.blockOn||[]).includes('expelled');$('#gateBlocked').checked=(e.groupActionGate?.blockOn||[]).includes('blocked');
  const sr=e.specialRules||{};$('#ruleSystemRequired').checked=!!sr.systemRequired;$('#ruleUsesPackBite').checked=!!sr.usesPackBite;$('#ruleRequiresSoloWolf').checked=!!sr.requiresNoOtherLivingWolf;$('#ruleActorMayBeDead').checked=!!sr.actorMayBeDead;$('#ruleAllowFriendlyFaction').checked=!!sr.allowFriendlyFaction;$('#ruleReplacesWolfBite').checked=!!sr.replacesWolfBite;
  $('#specialLimits').value=typeof e.limits==='string'?e.limits:JSON.stringify(e.limits||'');$('#specialConditions').value=typeof e.conditions==='string'?e.conditions:JSON.stringify(e.conditions||'');$('#specialAttributes').value=typeof e.attributes==='string'?e.attributes:JSON.stringify(e.attributes||'');
  $('#artifactSpecific').classList.toggle('hidden',currentKind!=='artifacts');
  if(currentKind==='artifacts'){const a=e.artifact||{};$('#artifactOwnerSelection').checked=!!a.ownerSelection;$('#artifactPersistentOwner').checked=!!a.persistentOwner;$('#artifactRevealFollow').checked=!!a.revealFollowTargetOnly;$('#artifactWakeRole').innerHTML='<option value="">Không</option><option value="source-2" '+(a.wakeWithRoleId==='source-2'?'selected':'')+'>Tiên Tri</option>';$('#artifactWakeAction').innerHTML='<option value="">Không</option>'+state.actions.role.map(x=>'<option value="'+esc(x.id)+'" '+(String(a.wakeWithActionId)===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('')}
  $('#functionList').innerHTML=(e.functions||[]).map(functionHtml).join('');bindFunctionControls();
}
function bindFunctionControls(){
  $$('#functionList .function-card').forEach(row=>{const idx=Number(row.dataset.fnIndex),fn=editDraft.functions[idx];
    $$('select[data-f]',row).forEach(s=>s.onchange=()=>{const k=s.dataset.f;if(k==='toNight')fn[k]=s.value==='end'?null:Number(s.value);else if(['usageCount','cooldownNights','targetCount','fromNight','perUserLimit'].includes(k))fn[k]=Number(s.value);else fn[k]=s.value;if(k==='targetCount'&&fn.targetCount>0)fn.noTarget=false;renderEntityFront()});
    $$('textarea[data-t]',row).forEach(t=>t.oninput=()=>{fn[t.dataset.t]=t.value});
    $$('input[data-b]',row).forEach(c=>c.onchange=()=>{const k=c.dataset.b;fn[k]=c.checked;if(k==='noTarget'&&c.checked)fn.targetCount=0;if(k==='noTarget'&&!c.checked&&fn.targetCount===0)fn.targetCount=1;renderEntityBack()});
  });
  $$('[data-remove-fn]').forEach(b=>b.onclick=()=>{editDraft.functions.splice(Number(b.dataset.removeFn),1);renderEntityBack()});
}
let editBackRendered=false;
function openEntityEditor(kind,id){currentKind=kind;currentId=id;const src=entityById(kind,id);if(!src)return;editDraft=normalizeEntity(src,kind);editBackRendered=false;$('#libraryHome').classList.add('hidden');$('#entityEditor').classList.remove('hidden');setFace('front');renderEntityFront();$('#library').scrollTop=0}
function closeEntityEditor(){editDraft=null;$('#entityEditor').classList.add('hidden');$('#libraryHome').classList.remove('hidden');renderEntityGrid(currentKind);$('#library').scrollTop=0}
function saveEntity(){if(!editDraft)return;const list=entityList(currentKind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list[i]=clone(editDraft);ensureAudioPlaceholder(currentKind,editDraft);saveState();renderEntityGrid(currentKind);closeEntityEditor()}
function deleteEntity(){if(!editDraft)return;if(!confirm('Xoá "'+(editDraft.name||'Lá này')+'"?'))return;const list=entityList(currentKind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list.splice(i,1);if(prefs[currentKind])delete prefs[currentKind][currentId];const bucket=currentKind==='cards'?'cards':'artifacts';state.audio[bucket]=(state.audio[bucket]||[]).filter(a=>a.targetId!==currentId);saveState();savePrefs();closeEntityEditor()}
function setFace(face){if(face==='back'&&!editBackRendered){renderEntityBack();editBackRendered=true}Array.from(document.querySelectorAll('.face-switch button')).forEach(b=>b.classList.toggle('active',b.dataset.face===face));Array.from(document.querySelectorAll('.face')).forEach(f=>f.classList.toggle('active',f.id===(face==='front'?'entityFront':'entityBack')))}
let faceTouchStart=null;
function bindFaceSwipe(){
  const editor=$('#entityEditor');
  editor.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];faceTouchStart={x:t.clientX,y:t.clientY,edge:t.clientX<30}},{passive:true});
  editor.addEventListener('touchend',e=>{if(!faceTouchStart||!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-faceTouchStart.x,dy=t.clientY-faceTouchStart.y;const edge=faceTouchStart.edge;faceTouchStart=null;if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.25)return;if(edge&&dx>70){closeEntityEditor();return}const front=$('#entityFront').classList.contains('active');if(dx<0&&front)setFace('back');else if(dx>0&&!front)setFace('front')},{passive:true});
}

function renderActions(){const q=($('#actionSearch').value||'').toLowerCase().trim(),list=actionList(actionKind).filter(a=>!q||String(a.name).toLowerCase().includes(q));$('#actionGrid').innerHTML='<button class="compact-entry add-only" id="addActionBox" aria-label="Thêm">＋</button>'+list.map(a=>'<article class="compact-entry" data-action-id="'+esc(a.id)+'"><b>'+esc(a.name)+'</b></article>').join('');$$('[data-action-id]').forEach(el=>bindDouble(el,()=>openActionEditor(el.dataset.actionId)));$('#addActionBox').onclick=createAction}
function renderEffects(){const q=($('#effectSearch').value||'').toLowerCase().trim(),list=state.effects.filter(e=>!q||String(e.name).toLowerCase().includes(q));$('#effectGrid').innerHTML='<button class="compact-entry add-only" id="addEffectBox" aria-label="Thêm">＋</button>'+list.map(e=>'<article class="compact-entry" data-effect-id="'+esc(e.id)+'"><b>'+esc(e.name)+'</b></article>').join('');$$('[data-effect-id]').forEach(el=>bindDouble(el,()=>openEffectEditor(el.dataset.effectId)));$('#addEffectBox').onclick=createEffect}
function bindDouble(el,cb){el.addEventListener('dblclick',cb);el.addEventListener('touchend',()=>{const now=Date.now(),prev=lastTouchMap.get(el)||0;if(now-prev<420){lastTouchMap.set(el,0);cb()}else lastTouchMap.set(el,now)},{passive:true})}
function showSheet(title,html,ctx){editContext=ctx;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#editSheet').classList.remove('hidden')}
function closeSheet(){$('#editSheet').classList.add('hidden');editContext=null}
function openActionEditor(id){const a=actionById(id);if(!a)return;showSheet('Hành Động • '+a.name,'<div class="form-grid"><label class="full">ID<input id="editActionId" value="'+esc(a.id)+'" readonly></label><label class="full">Tên<input id="editActionName" value="'+esc(a.name)+'"></label><label class="full">Mô tả<textarea id="editActionDescription">'+esc(a.description||'')+'</textarea></label><label class="full">Hiệu Ứng liên kết<select id="editActionEffect"><option value="">Không</option>'+state.effects.map(e=>'<option value="'+esc(e.id)+'" '+((a.effectIds||[]).includes(e.id)?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label></div>',{type:'action',id})}
function openEffectEditor(id){const e=effectById(id);if(!e)return;const w=e.webTemplate||{};showSheet('Hiệu Ứng • '+e.name,'<div class="form-grid"><label class="full">ID<input id="editEffectId" value="'+esc(e.id)+'" readonly></label><label class="full">Tên<input id="editEffectName" value="'+esc(e.name)+'"></label><label>Primitive<select id="editPrimitive">'+selectOptions([['EXPEL','EXPEL'],['REVIVE','REVIVE'],['KILL','KILL'],['PROTECT','PROTECT'],['BLOCK','BLOCK'],['TRANSFER_EFFECT','TRANSFER_EFFECT'],['REVEAL_FACTION','REVEAL_FACTION'],['REVEAL_ROLE','REVEAL_ROLE'],['COPY_FUNCTIONS','COPY_FUNCTIONS'],['CUSTOM','CUSTOM']],e.primitive)+'</select></label><label>Thời lượng<select id="editDuration">'+selectOptions([['instant','Tức thời'],['night','Đêm đó'],['nextDay','Đến hết sáng hôm sau'],['untilRemoved','Đến khi gỡ']],e.duration)+'</select></label><label class="full">Mô tả Engine<textarea id="editEffectDescription">'+esc(e.description||'')+'</textarea></label><label>Event type<input id="webEventType" value="'+esc(w.eventType||'')+'"></label><label>Emoji<input id="webEmoji" value="'+esc(w.emoji||'')+'"></label><label class="full">Tiêu đề Player Web<input id="webTitle" value="'+esc(w.title||'')+'"></label></div><div class="check-grid" style="margin-top:8px"><label class="check"><input type="checkbox" id="webRequireAck" '+(w.requireAck?'checked':'')+'><span>Yêu cầu xác nhận</span></label><label class="check"><input type="checkbox" id="webRequireResponse" '+(w.requireResponse?'checked':'')+'><span>Yêu cầu phản hồi</span></label></div>',{type:'effect',id})}
function createAction(){const a={id:uid(actionKind==='role'?'action':'artifact_action'),name:'Hành Động Mới',description:'',effectIds:[]};actionList(actionKind).push(a);ensureAudioPlaceholder('actions',a);saveState();renderActions();openActionEditor(a.id)}
function createEffect(){const e={id:uid('effect'),name:'Hiệu Ứng Mới',primitive:'CUSTOM',duration:'instant',description:'',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}};state.effects.push(e);saveState();renderEffects();openEffectEditor(e.id)}
function saveSheet(){if(!editContext)return;if(editContext.type==='action'){const a=actionById(editContext.id);a.name=($('#editActionName').value||'').trim()||a.name;a.description=$('#editActionDescription').value||'';a.effectIds=$('#editActionEffect').value?[$('#editActionEffect').value]:[];ensureAudioPlaceholder('actions',a);saveState();renderActions()}else if(editContext.type==='effect'){const e=effectById(editContext.id);e.name=($('#editEffectName').value||'').trim()||e.name;e.primitive=$('#editPrimitive').value;e.duration=$('#editDuration').value;e.description=$('#editEffectDescription').value||'';e.webTemplate={eventType:$('#webEventType').value||'',emoji:$('#webEmoji').value||'',title:$('#webTitle').value||'',requireAck:$('#webRequireAck').checked,requireResponse:$('#webRequireResponse').checked};saveState();renderEffects()}closeSheet()}

function renderThemeSeg(){const holder=$('#themeSeg');holder.innerHTML=state.themes.list.map(t=>'<button data-theme="'+esc(t.id)+'" class="'+(t.id===state.themes.selectedEditorId?'active':'')+'">'+esc(t.name)+'</button>').join('');$$('[data-theme]',holder).forEach(b=>b.onclick=()=>{state.themes.selectedEditorId=b.dataset.theme;state.themes.activeId=b.dataset.theme;saveState();renderTheme();applyActiveThemeUi();renderEntityGrid('cards');renderEntityGrid('artifacts')})}
async function renderTheme(){
  renderThemeSeg();const themeId=state.themes.selectedEditorId||state.themes.activeId||'theme-sea';
  const sections=$('#themeUiSections');sections.innerHTML='';
  for(const group of THEME_UI_GROUPS){const sec=document.createElement('details');sec.className='theme-section theme-collapsible';sec.innerHTML='<summary class="theme-section-head"><h3>'+esc(group.title)+'</h3></summary><div class="theme-slot-list"></div>';sections.appendChild(sec);const list=$('.theme-slot-list',sec);for(const [slotId,label] of group.slots){const src=await resolveUiSlot(themeId,slotId);const row=document.createElement('div');row.className='theme-slot';row.dataset.slotId=slotId;row.innerHTML='<img class="theme-slot-preview" alt=""><div class="theme-slot-main"><b>'+esc(label)+'</b><input type="url" placeholder="Link ảnh (không bắt buộc)" value="'+esc(themeById(themeId).ui?.[slotId]?.url||'')+'"></div><div class="theme-slot-actions"><button data-upload-slot="'+esc(slotId)+'" title="Tải ảnh">↑</button><button data-clear-slot="'+esc(slotId)+'" title="Mặc định">↺</button></div>';$('.theme-slot-preview',row).src=src||'';list.appendChild(row);$('input',row).onchange=()=>saveUiSlotUrl(themeId,slotId,$('input',row).value);$('[data-upload-slot]',row).onclick=()=>pickUiSlotFile(themeId,slotId);$('[data-clear-slot]',row).onclick=()=>clearUiSlot(themeId,slotId)}}
  await renderThemeEntityRows(themeId,'cards',$('#themeCardRows'));
  await renderThemeEntityRows(themeId,'artifacts',$('#themeArtifactRows'));
}
async function renderThemeEntityRows(themeId,kind,holder){
  if(!holder)return;holder.innerHTML='';
  for(const c of entityList(kind)){
    const src=await resolveArtwork(kind,c.id,'thumb');
    const row=document.createElement('div');row.className='theme-card-row theme-card-row-simple';
    row.innerHTML='<img alt=""><div class="theme-card-name"><b>'+esc(c.name)+'</b></div><div class="theme-slot-actions"><button data-theme-upload title="Upload Artwork">↑</button><button data-theme-clear title="Reset">↺</button></div>';
    $('img',row).src=src;holder.appendChild(row);
    $('[data-theme-upload]',row).onclick=()=>pickEntityThemeArtwork(themeId,kind,c.id);
    $('[data-theme-clear]',row).onclick=()=>clearEntityTheme(themeId,kind,c.id);
  }
}

async function saveUiSlotUrl(themeId,slotId,url){const t=themeById(themeId);t.ui=t.ui||{};t.ui[slotId]=t.ui[slotId]||{};t.ui[slotId].url=String(url||'').trim();saveState();await renderTheme();await applyActiveThemeUi()}
function pickFile(cb){const i=document.createElement('input');i.type='file';i.accept='image/*';i.hidden=true;document.body.appendChild(i);i.onchange=()=>{const f=i.files?.[0];i.remove();if(f)cb(f)};i.click()}
function pickUiSlotFile(themeId,slotId){pickFile(async f=>{await dbPut(uiBlobKey(themeId,slotId),f);objectUrls.delete(uiBlobKey(themeId,slotId));await renderTheme();await applyActiveThemeUi()})}
async function clearUiSlot(themeId,slotId){const t=themeById(themeId);if(t.ui)delete t.ui[slotId];await dbDelete(uiBlobKey(themeId,slotId)).catch(()=>{});objectUrls.delete(uiBlobKey(themeId,slotId));saveState();await renderTheme();await applyActiveThemeUi()}
function thumbBlobFromFile(file){return new Promise(resolve=>{const u=URL.createObjectURL(file),im=new Image();const done=v=>{try{URL.revokeObjectURL(u)}catch(_){}resolve(v||file)};im.onload=()=>{try{const c=document.createElement('canvas');c.width=360;c.height=330;const g=c.getContext('2d');if(!g)return done(file);g.fillStyle='#071421';g.fillRect(0,0,360,330);const sw=im.naturalWidth||1064,sh=im.naturalHeight||1478,scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(360-dw)/2,(330-dh)/2,dw,dh);c.toBlob(b=>done(b||file),'image/webp',.9)}catch(_){done(file)}};im.onerror=()=>done(file);im.src=u})}
function pickEntityThemeArtwork(themeId,kind,entityId){pickFile(async f=>{const dk=cardBlobKey(themeId,kind,entityId,'display'),tk=cardBlobKey(themeId,kind,entityId,'thumb');await dbPut(dk,f);await dbPut(tk,await thumbBlobFromFile(f));objectUrls.delete(dk);objectUrls.delete(tk);saveState();await renderTheme();renderEntityGrid(kind)})}
async function clearEntityTheme(themeId,kind,entityId){const t=themeById(themeId);t.mappings=t.mappings||{};delete t.mappings[entityId];for(const k of ['display','thumb']){await dbDelete(cardBlobKey(themeId,kind,entityId,k)).catch(()=>{});objectUrls.delete(cardBlobKey(themeId,kind,entityId,k))}saveState();await renderTheme();renderEntityGrid(kind)}

function addTheme(){const name=prompt('Tên Chủ Đề mới');if(!String(name||'').trim())return;const id='theme-'+Date.now().toString(36),src=themeById(state.themes.activeId);state.themes.list.push({id,name:String(name).trim(),builtin:false,locked:false,ui:clone(src.ui||{}),mappings:clone(src.mappings||{})});state.themes.selectedEditorId=id;state.themes.activeId=id;saveState();renderTheme()}

function audioBlobKey(kind,id){return 'audio|'+kind+'|'+id}
function bundledAudioBlob(a){const src=a?.sourceKey&&window.GMWW_V1_AUDIO?.[a.sourceKey];if(!src?.base64)return null;try{const raw=atob(src.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);return new Blob([u8],{type:src.type||'audio/mpeg'})}catch(_){return null}}
async function audioHasFile(a){if(a?.sourceKey&&window.GMWW_V1_AUDIO?.[a.sourceKey]?.base64)return true;if(a?.url)return true;const rec=await dbGet(audioBlobKey(audioKind,a.id)).catch(()=>null);return rec?.blob instanceof Blob}
async function renderAudio(){const list=state.audio[audioKind]||[];const resolved=await Promise.all(list.map(async a=>({a,ok:await audioHasFile(a)})));$('#audioGrid').innerHTML='<button class="audio-add-row" id="addAudioBox" aria-label="Thêm">＋</button>'+resolved.map(({a,ok})=>{const file=String(a.fileName||'').trim(),meta=file?(file+' • '+(ok?'OK':'Rỗng')):(ok?'OK':'Rỗng');return '<article class="audio-row" data-audio-id="'+esc(a.id)+'"><div class="audio-row-main"><b>'+esc(a.name)+'</b><small>'+esc(meta)+'</small></div><div class="audio-row-actions"><button data-audio-play title="Phát">▶</button><button class="replace-audio" data-audio-replace title="Thay thế">Thay thế</button><button class="delete-audio" data-audio-delete title="Xoá">🗑</button></div></article>'}).join('');
  $('#addAudioBox').onclick=()=>{const name=prompt('Tên Âm Thanh');if(!String(name||'').trim())return;list.unshift({id:uid('audio'),name:String(name).trim(),fileName:'',verifiedBinary:false});saveState();renderAudio()};
  $$('[data-audio-id]').forEach(row=>{const a=list.find(x=>String(x.id)===String(row.dataset.audioId));$('[data-audio-play]',row).onclick=()=>playAudioItem(a);$('[data-audio-replace]',row).onclick=()=>replaceAudioItem(a);$('[data-audio-delete]',row).onclick=()=>deleteAudioItem(a)});
}
async function playAudioItem(a){if(!a)return;let src='',localUrl=false;const rec=await dbGet(audioBlobKey(audioKind,a.id)).catch(()=>null);let blob=rec?.blob instanceof Blob?rec.blob:null;if(!blob)blob=bundledAudioBlob(a);if(blob){src=URL.createObjectURL(blob);localUrl=true}else if(a.url)src=a.url;if(!src){alert('Âm Thanh này đang Rỗng.');return}const au=new Audio(src);au.preload='auto';const cleanup=()=>{if(localUrl)URL.revokeObjectURL(src)};au.onended=cleanup;au.onerror=()=>{cleanup();alert('Không thể phát file Âm Thanh.')};try{await au.play()}catch(e){cleanup();alert('Không thể phát file Âm Thanh.')}}
function replaceAudioItem(a){if(!a)return;const i=document.createElement('input');i.type='file';i.accept='audio/*';i.hidden=true;document.body.appendChild(i);i.onchange=async()=>{const f=i.files?.[0];i.remove();if(!f)return;await dbPut(audioBlobKey(audioKind,a.id),f);a.fileName=f.name;a.verifiedBinary=true;delete a.status;saveState();renderAudio()};i.click()}
async function deleteAudioItem(a){if(!a||!confirm('Xoá Âm Thanh "'+(a.name||'')+'"?'))return;const list=state.audio[audioKind]||[],i=list.findIndex(x=>String(x.id)===String(a.id));if(i>=0)list.splice(i,1);await dbDelete(audioBlobKey(audioKind,a.id)).catch(()=>{});saveState();renderAudio()}

function bindCore(){
  $$('.nav').forEach(n=>n.onclick=()=>{$$('.page').forEach(p=>p.classList.toggle('active',p.id===n.dataset.page));$$('.nav').forEach(x=>x.classList.toggle('active',x===n));const p=$('#'+n.dataset.page);if(p)p.scrollTop=0});
  $$('.libtab').forEach(b=>b.onclick=()=>{$$('.libtab').forEach(x=>x.classList.toggle('active',x===b));$$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));$('#library').scrollTop=0;if(b.dataset.lib==='themes')renderTheme();if(b.dataset.lib==='audio')renderAudio()});
  $$('[data-filter-kind]').forEach(row=>$$('.filter',row).forEach(b=>b.onclick=()=>{$$('.filter',row).forEach(x=>x.classList.toggle('active',x===b));if(row.dataset.filterKind==='cards')cardFilter=b.dataset.filter;else artifactFilter=b.dataset.filter;renderEntityGrid(row.dataset.filterKind)}));
  const topBack=$('#topBackEntity');if(topBack)topBack.onclick=closeEntityEditor;$('#backEntity').onclick=closeEntityEditor;$('#saveEntity').onclick=saveEntity;$('#deleteEntity').onclick=deleteEntity;
  $$('.face-switch button').forEach(b=>b.onclick=()=>setFace(b.dataset.face));
  $('#entityName').oninput=()=>{if(editDraft){editDraft.name=$('#entityName').value;renderEntityFront()}};
  $('#entityInformation').oninput=()=>{if(editDraft){editDraft.information=$('#entityInformation').value;renderEntityFront()}};
  $('#entityLives').oninput=()=>{if(editDraft)editDraft.lives=Math.max(1,Number($('#entityLives').value||1))};
  $$('#factionSeg button').forEach(b=>b.onclick=()=>{if(!editDraft||currentKind!=='cards')return;editDraft.factionId=b.dataset.faction;renderEntityBack();renderEntityFront()});
  const flagMap={flagUseDay:'useDay',flagUseNight:'useNight',flagNightImmune:'nightImmune',flagAllowMultipleActions:'allowMultipleActions',flagPassive:'passive',flagSoloWolfOnly:'soloWolfOnly'};
  for(const [id,k] of Object.entries(flagMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.flags[k]=$('#'+id).checked};
  $('#winCondition').oninput=()=>{if(editDraft)editDraft.winCondition=$('#winCondition').value};
  $('#passiveRuleEnabled').onchange=()=>{if(editDraft)editDraft.passiveRule.enabled=$('#passiveRuleEnabled').checked};$('#passiveRuleType').onchange=()=>{if(editDraft)editDraft.passiveRule.type=$('#passiveRuleType').value};
  $('#passiveFirstTime').onchange=()=>{if(editDraft)editDraft.passiveRule.firstTime=$('#passiveFirstTime').value};$('#passiveNextTime').onchange=()=>{if(editDraft)editDraft.passiveRule.nextTime=$('#passiveNextTime').value};$('#passiveOnDeath').onchange=()=>{if(editDraft)editDraft.passiveRule.onDeath=$('#passiveOnDeath').checked};$('#passiveSkipDead').onchange=()=>{if(editDraft)editDraft.passiveRule.skipIfTargetAlreadyDead=$('#passiveSkipDead').checked};
  $('#groupGateEnabled').onchange=()=>{if(editDraft)editDraft.groupActionGate.enabled=$('#groupGateEnabled').checked};$('#groupGateAction').onchange=()=>{if(editDraft)editDraft.groupActionGate.actionId=$('#groupGateAction').value};$('#groupGateScope').onchange=()=>{if(editDraft)editDraft.groupActionGate.scope=$('#groupGateScope').value};
  for(const id of ['gateExpelled','gateBlocked'])$('#'+id).onchange=()=>{if(!editDraft)return;const arr=[];if($('#gateExpelled').checked)arr.push('expelled');if($('#gateBlocked').checked)arr.push('blocked');editDraft.groupActionGate.blockOn=arr};
  const specialMap={ruleSystemRequired:'systemRequired',ruleUsesPackBite:'usesPackBite',ruleRequiresSoloWolf:'requiresNoOtherLivingWolf',ruleActorMayBeDead:'actorMayBeDead',ruleAllowFriendlyFaction:'allowFriendlyFaction',ruleReplacesWolfBite:'replacesWolfBite'};for(const [id,k] of Object.entries(specialMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.specialRules[k]=$('#'+id).checked};
  $('#specialLimits').oninput=()=>{if(editDraft)editDraft.limits=$('#specialLimits').value};$('#specialConditions').oninput=()=>{if(editDraft)editDraft.conditions=$('#specialConditions').value};$('#specialAttributes').oninput=()=>{if(editDraft)editDraft.attributes=$('#specialAttributes').value};
  for(const [id,k] of [['artifactOwnerSelection','ownerSelection'],['artifactPersistentOwner','persistentOwner'],['artifactRevealFollow','revealFollowTargetOnly']])$('#'+id).onchange=()=>{if(editDraft?.artifact)editDraft.artifact[k]=$('#'+id).checked};
  $('#artifactWakeRole').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithRoleId=$('#artifactWakeRole').value};$('#artifactWakeAction').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithActionId=$('#artifactWakeAction').value};
  $('#addFunction').onclick=()=>{if(!editDraft)return;const list=actionList(currentKind==='artifacts'?'artifacts':'role'),a=list[0];editDraft.functions.push({id:uid('fn'),actionId:a?.id||'',phase:'night',usageMode:'unlimited',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,description:'',systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false,effectIds:[]});renderEntityBack()};
  $$('#actionKindSeg button').forEach(b=>b.onclick=()=>{$$('#actionKindSeg button').forEach(x=>x.classList.toggle('active',x===b));actionKind=b.dataset.actionKind;renderActions()});$('#actionSearch').oninput=renderActions;$('#effectSearch').oninput=renderEffects;
  $('#sheetClose').onclick=closeSheet;$('#sheetCancel').onclick=closeSheet;$('#sheetSave').onclick=saveSheet;$('#editSheet').onclick=e=>{if(e.target===$('#editSheet'))closeSheet()};
  $('#addTheme').onclick=addTheme;
  $$('#audioKindSeg button').forEach(b=>b.onclick=()=>{$$('#audioKindSeg button').forEach(x=>x.classList.toggle('active',x===b));audioKind=b.dataset.audioKind;renderAudio()});
}
async function seedBundledV1Audio(){try{const a=window.GMWW_V1_AUDIO?.['ROLE:source-18'];if(!a?.base64)return;const key=audioBlobKey('cards','audio_role_old_witch'),stamp='V1.08|ROLE:source-18|'+a.base64.length;if(localStorage.getItem('GMWW_V1_AUDIO_SEED_SOURCE18')===stamp&&await dbGet(key))return;const raw=atob(a.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);await dbPut(key,new Blob([u8],{type:a.type||'audio/mpeg'}));localStorage.setItem('GMWW_V1_AUDIO_SEED_SOURCE18',stamp)}catch(e){console.warn('V1 audio seed failed',e)}}
async function boot(){bindCore();bindFaceSwipe();renderEntityGrid('cards');renderEntityGrid('artifacts');renderActions();renderEffects();renderAudio();try{await ensureDefaultThumb()}catch(e){console.warn('Default artwork init failed',e)}try{await renderTheme()}catch(e){console.warn('Theme render failed',e)}try{await applyActiveThemeUi()}catch(e){console.warn('Theme apply failed',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

/* V2.22 — Server Health in Cài Đặt */
const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';
const GMWW_GM_AUTH="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
let serverHealthBusy=false;
function setServerHealthState(kind,text,detail,data={}){
  const pill=document.getElementById('serverHealthPill'),dot=document.getElementById('serverHealthDot');
  if(pill){pill.className='health-pill '+kind;pill.textContent=kind==='ok'?'HOẠT ĐỘNG TỐT':kind==='warn'?'CÓ CẢNH BÁO':kind==='bad'?'MẤT KẾT NỐI':'ĐANG KIỂM TRA'}
  if(dot)dot.className='health-dot '+kind;
  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put('serverHealthText',text);put('serverHealthDetail',detail);
  put('healthPlayerWeb',data.web||'—');put('healthApi',data.api||'—');put('healthLatency',data.latency||'—');put('healthVersion',data.version||'—');
  put('healthCheckedAt','Kiểm tra lúc '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
}
async function checkServerHealth(){
  if(serverHealthBusy)return; serverHealthBusy=true;
  const btn=document.getElementById('checkServerHealth');if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.classList.add('is-busy')}
  setServerHealthState('checking','Đang kiểm tra Server…','Đang kết nối tới GMWW V2 production');
  const started=performance.now();
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    const res=await fetch(GMWW_SERVER_BASE+'/api/health?ipa='+Date.now(),{method:'GET',cache:'no-store',signal:controller.signal});
    clearTimeout(timer);
    const latency=Math.max(1,Math.round(performance.now()-started));
    let body={};try{body=await res.json()}catch{}
    if(!res.ok||body.ok!==true)throw new Error('HTTP '+res.status);
    const level=latency<=800?'ok':'warn';
    setServerHealthState(level,level==='ok'?'Server đang hoạt động tốt':'Server hoạt động nhưng phản hồi chậm',level==='ok'?'Kết nối Player Web và API bình thường':'Độ trễ hiện cao hơn mức khuyến nghị',{web:'Online',api:'Online',latency:latency+' ms',version:body.version||'—'});
  }catch(err){
    const latency=Math.max(1,Math.round(performance.now()-started));
    setServerHealthState('bad','Không thể kết nối Server','Kiểm tra Internet hoặc trạng thái Cloudflare',{web:'Không xác định',api:'Offline',latency:latency+' ms',version:'—'});
  }finally{serverHealthBusy=false;if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.classList.remove('is-busy')}}
}
const healthButton=document.getElementById('checkServerHealth');
if(healthButton)healthButton.addEventListener('click',checkServerHealth);
document.querySelectorAll('[data-page="settings"]').forEach(el=>el.addEventListener('click',()=>setTimeout(checkServerHealth,60)));
window.addEventListener('online',()=>{if(document.getElementById('settings')?.classList.contains('active'))checkServerHealth()});

/* V2.27 — stable GitHub optimization controls for iPhone/WKWebView */
const GMWW_GITHUB_REPO_URL='https://github.com/WilliamPham0702/GMWW-V2.00';
const GMWW_GITHUB_API_URL='https://api.github.com/repos/WilliamPham0702/GMWW-V2.00';
let githubOptimizeBusy=false;
function setGithubOptimizeState(kind,text,detail,status,result){
  const pill=document.getElementById('githubOptimizePill');
  if(pill){pill.className='health-pill '+kind;pill.textContent=kind==='ok'?'ĐÃ KIỂM TRA':kind==='warn'?'CẦN KIỂM TRA':kind==='bad'?'KHÔNG KẾT NỐI':'ĐANG KIỂM TRA'}
  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put('githubOptimizeText',text);
  put('githubOptimizeDetail',detail);
  put('githubOptimizeStatus',status||'—');
  put('githubOptimizeResult',result||'—');
  put('githubOptimizeChecked',new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
}
async function checkGithubOptimize(){
  if(githubOptimizeBusy)return;
  githubOptimizeBusy=true;
  const btn=document.getElementById('checkGithubOptimize');
  if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.classList.add('is-busy')}
  setGithubOptimizeState('checking','Đang kiểm tra GitHub…','Đọc thông tin repo GMWW-V2.00; không sửa hoặc xoá file.','Đang kiểm tra','—');
  const started=performance.now();
  let timer=null;
  try{
    const controller=new AbortController();
    timer=setTimeout(()=>controller.abort(),5000);
    const res=await fetch(GMWW_GITHUB_API_URL,{method:'GET',cache:'no-store',headers:{'Accept':'application/vnd.github+json'},signal:controller.signal});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const body=await res.json();
    const latency=Math.max(1,Math.round(performance.now()-started));
    const repoSizeKb=Math.max(0,Number(body?.size||0));
    const repoSize=repoSizeKb>=1024?(repoSizeKb/1024).toFixed(1)+' MB':repoSizeKb+' KB';
    setGithubOptimizeState('ok','GitHub hoạt động bình thường','Repo truy cập được. Có thể tiếp tục tối ưu ảnh/tài nguyên qua ChatGPT mà không ảnh hưởng gameplay.','Sẵn sàng',repoSize+' • '+latency+' ms');
  }catch(err){
    const online=navigator.onLine;
    setGithubOptimizeState(online?'warn':'bad',online?'GitHub chưa phản hồi':'Thiết bị đang offline',online?'Không thay đổi dữ liệu. Hãy thử lại sau hoặc dùng nút Mở GitHub.':'Kết nối Internet rồi thử lại.',online?'Thử lại sau':'Offline','—');
  }finally{
    if(timer)clearTimeout(timer);
    githubOptimizeBusy=false;
    if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.classList.remove('is-busy')}
  }
}
const githubOptimizeButton=document.getElementById('checkGithubOptimize');
if(githubOptimizeButton){
  githubOptimizeButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();checkGithubOptimize()},{passive:false});
}
const githubOpenButton=document.getElementById('openGithubRepo');
if(githubOpenButton){
  githubOpenButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.location.assign(GMWW_GITHUB_REPO_URL)},{passive:false});
}


/* V2.29 — V1 Member management + Ranking + History */
const memberAdminState={members:[],avatars:[],busy:false,loaded:false,tab:'directory',filter:'all',query:'',historyResult:'all',historyLogin:'',sheetMode:'',sheetMember:null,selectedAvatarId:''};

function gmHeaders(extra={}){return {...extra,Authorization:'Bearer '+GMWW_GM_AUTH}}
async function gmApi(path,opts={}){
  const headers=gmHeaders(opts.headers||{});
  if(opts.body!==undefined&&!headers['content-type'])headers['content-type']='application/json';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(GMWW_SERVER_BASE+path,{...opts,headers,cache:'no-store',signal:controller.signal});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data.message||data.error||('HTTP '+res.status));
    return data;
  }finally{clearTimeout(timer)}
}
function memberEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function memberAvatarUrl(id){return GMWW_SERVER_BASE+'/api/avatars/'+encodeURIComponent(String(id||''))+'/image'}
function memberDate(v,withTime=false){
  if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';
  return d.toLocaleString('vi-VN',withTime?{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric'});
}
function memberStats(m){const s=m?.stats||{},w=Number(s.wins||0),l=Number(s.losses||0),games=w+l,rate=games?Math.round(w*100/games):0;return{w,l,games,rate}}
function setMemberBusy(on){
  memberAdminState.busy=!!on;
  const refresh=document.getElementById('refreshMembers');if(refresh){refresh.disabled=!!on;refresh.classList.toggle('is-busy',!!on)}
  const add=document.getElementById('addMember');if(add)add.disabled=!!on;
}
async function loadMembers(force=false){
  if(memberAdminState.busy)return;
  if(memberAdminState.loaded&&!force){renderMembersAll();return}
  setMemberBusy(true);
  const list=document.getElementById('memberDirectoryList');if(list)list.innerHTML='<div class="member-empty">Đang đồng bộ Thành Viên…</div>';
  try{
    const [dir,avatars]=await Promise.all([
      gmApi('/api/gm/members'),
      memberAdminState.avatars.length?Promise.resolve({avatars:memberAdminState.avatars}):fetch(GMWW_SERVER_BASE+'/api/avatars?gm='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>({avatars:[]}))
    ]);
    memberAdminState.members=Array.isArray(dir?.members)?dir.members:[];
    if(Array.isArray(avatars?.avatars)&&avatars.avatars.length)memberAdminState.avatars=avatars.avatars;
    memberAdminState.loaded=true;
    renderMembersAll();
  }catch(err){
    if(list)list.innerHTML='<div class="member-empty member-error">'+memberEsc(err.message||'Không tải được Thành Viên.')+'</div>';
  }finally{setMemberBusy(false)}
}
function renderMembersAll(){renderMemberSummary();renderMemberDirectory();renderMemberRanking();renderMemberHistory();renderHistoryMemberOptions()}
function renderMemberSummary(){
  const rows=memberAdminState.members,put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
  const online=rows.filter(m=>m.online).length,resets=rows.filter(m=>m.resetRequestedAt).length,games=rows.reduce((n,m)=>n+memberStats(m).games,0);
  put('memberTotal',rows.length);put('memberOnline',online);put('memberResetRequests',resets);put('memberGames',games);
}
function filteredMembers(){
  const q=memberAdminState.query.trim().toLocaleLowerCase('vi'),f=memberAdminState.filter;
  return memberAdminState.members.filter(m=>{
    const hit=!q||String(m.displayName||'').toLocaleLowerCase('vi').includes(q)||String(m.loginId||'').toLowerCase().includes(q);
    const status=f==='all'||(f==='online'&&m.online)||(f==='offline'&&!m.online)||(f==='reset'&&m.resetRequestedAt);
    return hit&&status;
  });
}
function renderMemberDirectory(){
  const box=document.getElementById('memberDirectoryList');if(!box)return;
  const rows=filteredMembers();box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Không có Thành Viên phù hợp.</div>';return}
  for(const m of rows){
    const s=memberStats(m),card=document.createElement('article');card.className='member-card';
    card.innerHTML=
      '<img class="member-avatar" alt="">'+
      '<div class="member-card-main"><div class="member-name-row"><div><b></b><small></small></div><span class="member-status"></span></div>'+
      '<div class="member-meta"><span class="member-room"></span><span>'+s.w+' Thắng</span><span>'+s.l+' Thua</span><span>'+s.rate+'%</span></div>'+
      '<div class="member-flags"></div></div>'+
      '<div class="member-card-actions">'+
      '<button data-act="history" type="button">Lịch sử</button><button data-act="edit" type="button">Sửa</button>'+
      '<button data-act="reset" type="button">Reset MK</button><button data-act="delete" class="danger-mini" type="button">Xoá</button></div>';
    const img=card.querySelector('.member-avatar');img.src=memberAvatarUrl(m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    card.querySelector('.member-card-main b').textContent=m.displayName||m.loginId;
    card.querySelector('.member-card-main small').textContent='@'+m.loginId;
    const status=card.querySelector('.member-status');status.textContent=m.online?'ONLINE':'OFFLINE';status.classList.toggle('online',!!m.online);
    card.querySelector('.member-room').textContent=m.currentRoomCode?('Phòng '+m.currentRoomCode+(m.ready?' • Sẵn sàng':'')):'Chưa vào phòng';
    const flags=card.querySelector('.member-flags');
    if(m.resetRequestedAt)flags.innerHTML+='<span class="member-flag reset">YÊU CẦU RESET</span>';
    if(m.source)flags.innerHTML+='<span class="member-flag">'+memberEsc(m.source)+'</span>';
    card.querySelector('[data-act="history"]').onclick=()=>{memberAdminState.historyLogin=m.loginId;switchMemberTab('history');renderHistoryMemberOptions();renderMemberHistory()};
    card.querySelector('[data-act="edit"]').onclick=()=>openMemberSheet('edit',m);
    card.querySelector('[data-act="reset"]').onclick=()=>openMemberSheet('reset',m);
    card.querySelector('[data-act="delete"]').onclick=()=>deleteMember(m);
    box.appendChild(card);
  }
}
function renderMemberRanking(){
  const box=document.getElementById('memberRankingList');if(!box)return;
  const rows=[...memberAdminState.members].sort((a,b)=>{
    const A=memberStats(a),B=memberStats(b);
    return B.w-A.w||B.rate-A.rate||B.games-A.games||String(a.displayName||a.loginId).localeCompare(String(b.displayName||b.loginId),'vi');
  });
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Chưa có dữ liệu xếp hạng.</div>';return}
  rows.forEach((m,i)=>{
    const s=memberStats(m),row=document.createElement('article');row.className='ranking-row'+(i<3?' podium':'');
    row.innerHTML='<div class="rank-no"></div><img class="rank-avatar" alt=""><div class="rank-main"><b></b><small></small></div><div class="rank-stats"><b>'+s.w+'</b><small>Thắng</small></div><div class="rank-stats"><b>'+s.rate+'%</b><small>Tỷ lệ</small></div><div class="rank-stats"><b>'+s.games+'</b><small>Ván</small></div>';
    row.querySelector('.rank-no').textContent=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    const img=row.querySelector('.rank-avatar');img.src=memberAvatarUrl(m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.rank-main b').textContent=m.displayName||m.loginId;
    row.querySelector('.rank-main small').textContent=s.l+' Thua'+(m.online?' • Online':'');
    box.appendChild(row);
  });
}
function allHistoryRows(){
  const out=[];
  for(const m of memberAdminState.members){
    for(const h of (Array.isArray(m.history)?m.history:[]))out.push({...h,loginId:m.loginId,displayName:m.displayName||m.loginId,avatarId:m.avatarId});
  }
  return out.sort((a,b)=>(Date.parse(b.playedAt||0)||0)-(Date.parse(a.playedAt||0)||0));
}
function renderHistoryMemberOptions(){
  const sel=document.getElementById('historyMemberFilter');if(!sel)return;
  const value=memberAdminState.historyLogin||'';
  sel.innerHTML='<option value="">Tất cả Thành Viên</option>'+memberAdminState.members.map(m=>'<option value="'+memberEsc(m.loginId)+'">'+memberEsc(m.displayName||m.loginId)+'</option>').join('');
  sel.value=value;
}
function renderMemberHistory(){
  const box=document.getElementById('memberHistoryList');if(!box)return;
  const member=memberAdminState.historyLogin,result=memberAdminState.historyResult;
  const rows=allHistoryRows().filter(h=>(!member||h.loginId===member)&&(result==='all'||h.result===result));
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Chưa có lịch sử chơi phù hợp.</div>';return}
  for(const h of rows){
    const row=document.createElement('article');row.className='history-row';
    const win=h.result==='win';
    row.innerHTML='<img class="history-avatar" alt=""><div class="history-main"><div class="history-title"><b></b><span class="history-result '+(win?'win':'lose')+'">'+(win?'THẮNG':'THUA')+'</span></div><small class="history-sub"></small><small class="history-detail"></small></div><time></time>';
    const img=row.querySelector('.history-avatar');img.src=memberAvatarUrl(h.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.history-title b').textContent=h.displayName||h.loginId;
    row.querySelector('.history-sub').textContent=[h.roomName||h.gameName||'Ván GMWW',h.roleName||'',h.faction||''].filter(Boolean).join(' • ');
    row.querySelector('.history-detail').textContent=[h.winnerFaction?('Thắng: '+h.winnerFaction):'',h.roomCode?('Phòng '+h.roomCode):''].filter(Boolean).join(' • ');
    row.querySelector('time').textContent=memberDate(h.playedAt,true);
    box.appendChild(row);
  }
}
function switchMemberTab(tab){
  memberAdminState.tab=tab;
  document.querySelectorAll('#memberTabs [data-member-tab]').forEach(b=>b.classList.toggle('active',b.dataset.memberTab===tab));
  document.querySelectorAll('.member-pane').forEach(p=>p.classList.toggle('active',p.id==='memberPane-'+tab));
  if(tab==='history')renderMemberHistory();if(tab==='ranking')renderMemberRanking();
}
function openMemberSheet(mode,m=null){
  memberAdminState.sheetMode=mode;memberAdminState.sheetMember=m;memberAdminState.selectedAvatarId=m?.avatarId||memberAdminState.avatars[0]?.id||'';
  const sheet=document.getElementById('memberSheet'),title=document.getElementById('memberSheetTitle'),body=document.getElementById('memberSheetBody'),save=document.getElementById('memberSheetSave');
  if(!sheet||!body)return;
  if(mode==='reset'){
    title.textContent='Reset mật khẩu • '+(m?.displayName||m?.loginId||'');
    body.innerHTML='<div class="member-form"><label>Mật khẩu tạm thời<input id="memberResetPassword" type="password" minlength="4" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự"></label><p class="member-form-note">Sau khi reset, các phiên đăng nhập cũ của Thành Viên sẽ bị vô hiệu hoá.</p></div>';
    save.textContent='RESET MẬT KHẨU';
  }else{
    const editing=mode==='edit';
    title.textContent=editing?'Sửa Thành Viên':'Thêm Thành Viên';
    body.innerHTML='<div class="member-form">'+
      '<label>Member ID<input id="memberLoginId" '+(editing?'disabled':'')+' value="'+memberEsc(m?.loginId||'')+'" maxlength="20" placeholder="Không dấu, không khoảng trắng"></label>'+
      '<label>Tên hiển thị<input id="memberDisplayName" value="'+memberEsc(m?.displayName||'')+'" maxlength="24" placeholder="Tên hiển thị"></label>'+
      (editing?'':'<label>Mật khẩu tạm thời<input id="memberPassword" type="password" minlength="4" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự"></label>')+
      '<div class="member-avatar-picker"><div class="member-form-label">Avatar</div><div class="member-avatar-grid" id="memberAvatarGrid"></div></div></div>';
    renderMemberAvatarPicker();
    save.textContent=editing?'LƯU THAY ĐỔI':'TẠO THÀNH VIÊN';
  }
  sheet.classList.remove('hidden');
}
function renderMemberAvatarPicker(){
  const box=document.getElementById('memberAvatarGrid');if(!box)return;box.innerHTML='';
  for(const a of memberAdminState.avatars){
    const b=document.createElement('button');b.type='button';b.className='member-avatar-choice';b.classList.toggle('selected',String(a.id)===String(memberAdminState.selectedAvatarId));
    b.innerHTML='<img alt=""><small></small>';const img=b.querySelector('img');img.src=String(a.imageUrl||memberAvatarUrl(a.id));img.onerror=()=>{img.style.visibility='hidden'};b.querySelector('small').textContent=a.name||a.id;
    b.onclick=()=>{memberAdminState.selectedAvatarId=a.id;renderMemberAvatarPicker()};box.appendChild(b);
  }
  if(!memberAdminState.avatars.length)box.innerHTML='<div class="member-empty">Không tải được Kho Avatar.</div>';
}
function closeMemberSheet(){const s=document.getElementById('memberSheet');if(s)s.classList.add('hidden');memberAdminState.sheetMode='';memberAdminState.sheetMember=null}
async function saveMemberSheet(){
  const btn=document.getElementById('memberSheetSave');if(btn?.disabled)return;
  const mode=memberAdminState.sheetMode,m=memberAdminState.sheetMember;
  try{
    if(btn){btn.disabled=true;btn.classList.add('is-busy')}
    if(mode==='reset'){
      const newPassword=document.getElementById('memberResetPassword')?.value||'';if(newPassword.length<4)throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
      await gmApi('/api/gm/members/reset-password',{method:'POST',body:JSON.stringify({loginId:m.loginId,newPassword})});
    }else{
      const loginId=document.getElementById('memberLoginId')?.value.trim()||m?.loginId||'',displayName=document.getElementById('memberDisplayName')?.value.trim()||'',avatarId=memberAdminState.selectedAvatarId;
      if(displayName.length<2)throw new Error('Tên hiển thị phải có ít nhất 2 ký tự.');
      if(!avatarId)throw new Error('Vui lòng chọn Avatar.');
      if(mode==='edit'){
        await gmApi('/api/gm/members/edit',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId})});
      }else{
        const password=document.getElementById('memberPassword')?.value||'';if(password.length<4)throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
        await gmApi('/api/gm/members/create',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId,password})});
      }
    }
    closeMemberSheet();memberAdminState.loaded=false;await loadMembers(true);
  }catch(err){alert(err.message||'Không thể lưu Thành Viên.')}
  finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function deleteMember(m){
  if(!m||!confirm('Xoá Thành Viên "'+(m.displayName||m.loginId)+'"?\\nLịch sử và phiên đăng nhập của Thành Viên này cũng sẽ bị xoá.'))return;
  try{setMemberBusy(true);await gmApi('/api/gm/members/'+encodeURIComponent(m.loginId),{method:'DELETE'});memberAdminState.loaded=false;await loadMembers(true)}
  catch(err){alert(err.message||'Không thể xoá Thành Viên.')}finally{setMemberBusy(false)}
}
async function purgeAllMembers(){
  if(!confirm('Xoá TOÀN BỘ Thành Viên và các phiên đăng nhập?'))return;
  const typed=prompt('Nhập XOÁ HẾT để xác nhận:','');if(String(typed||'').trim().toUpperCase()!=='XOÁ HẾT')return;
  try{setMemberBusy(true);await gmApi('/api/gm/members',{method:'DELETE'});memberAdminState.members=[];memberAdminState.loaded=false;await loadMembers(true)}
  catch(err){alert(err.message||'Không thể xoá toàn bộ Thành Viên.')}finally{setMemberBusy(false)}
}
const memberTabsEl=document.getElementById('memberTabs');if(memberTabsEl)memberTabsEl.addEventListener('click',e=>{const b=e.target.closest('[data-member-tab]');if(b)switchMemberTab(b.dataset.memberTab)});
const memberSearchEl=document.getElementById('memberSearch');if(memberSearchEl)memberSearchEl.addEventListener('input',()=>{memberAdminState.query=memberSearchEl.value;renderMemberDirectory()});
const memberFilterRow=document.getElementById('memberFilterRow');if(memberFilterRow)memberFilterRow.addEventListener('click',e=>{const b=e.target.closest('[data-member-filter]');if(!b)return;memberAdminState.filter=b.dataset.memberFilter;memberFilterRow.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberDirectory()});
const historyResultFilter=document.getElementById('historyResultFilter');if(historyResultFilter)historyResultFilter.addEventListener('click',e=>{const b=e.target.closest('[data-history-result]');if(!b)return;memberAdminState.historyResult=b.dataset.historyResult;historyResultFilter.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberHistory()});
const historyMemberFilter=document.getElementById('historyMemberFilter');if(historyMemberFilter)historyMemberFilter.addEventListener('change',()=>{memberAdminState.historyLogin=historyMemberFilter.value;renderMemberHistory()});
const refreshMembers=document.getElementById('refreshMembers');if(refreshMembers)refreshMembers.addEventListener('click',()=>{memberAdminState.loaded=false;loadMembers(true)});
const addMember=document.getElementById('addMember');if(addMember)addMember.addEventListener('click',()=>openMemberSheet('create'));
const purgeMembers=document.getElementById('purgeMembers');if(purgeMembers)purgeMembers.addEventListener('click',purgeAllMembers);
const memberSheetClose=document.getElementById('memberSheetClose');if(memberSheetClose)memberSheetClose.addEventListener('click',closeMemberSheet);
const memberSheetCancel=document.getElementById('memberSheetCancel');if(memberSheetCancel)memberSheetCancel.addEventListener('click',closeMemberSheet);
const memberSheetSave=document.getElementById('memberSheetSave');if(memberSheetSave)memberSheetSave.addEventListener('click',saveMemberSheet);
const memberSheet=document.getElementById('memberSheet');if(memberSheet)memberSheet.addEventListener('click',e=>{if(e.target===memberSheet)closeMemberSheet()});
document.querySelectorAll('[data-page="members"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>loadMembers(false),40)));

})();