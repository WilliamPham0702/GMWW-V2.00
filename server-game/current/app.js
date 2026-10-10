(()=>{'use strict';

const VERSION='3.63';
// V2.82 runtime: stable Player session restore + seated idle animation.
// Retain the existing storage namespace: this release changes presentation only.
const STATE_KEY='GMWW_V258_STATE';
const PREF_KEY='GMWW_V258_PREFS';
const PLAY_AUDIO_MUTED_KEY='GMWW_V289_PLAY_AUDIO_MUTED';
const OLD_STATE_KEYS=['GMWW_V257_STATE','GMWW_V256_STATE','GMWW_V255_STATE','GMWW_V254_STATE','GMWW_V253_STATE','GMWW_V252_STATE','GMWW_V251_STATE','GMWW_V250_STATE','GMWW_V247_STATE','GMWW_V246_STATE','GMWW_V245_STATE','GMWW_V244_STATE','GMWW_V243_STATE','GMWW_V242_STATE','GMWW_V241_STATE','GMWW_V240_STATE','GMWW_V239_STATE','GMWW_V238_STATE','GMWW_V237_STATE','GMWW_V236_STATE','GMWW_V235_STATE','GMWW_V234_STATE','GMWW_V233_STATE','GMWW_V232_STATE','GMWW_V231_STATE','GMWW_V230_STATE','GMWW_V229_STATE','GMWW_V228_STATE','GMWW_V227_STATE','GMWW_V226_STATE','GMWW_V225_STATE','GMWW_V224_STATE','GMWW_V223_STATE','GMWW_V222_STATE','GMWW_V221_STATE','GMWW_V220_STATE','GMWW_V219_STATE','GMWW_V218_STATE','GMWW_V217_STATE','GMWW_V216_STATE','GMWW_V215_STATE','GMWW_V214_STATE','GMWW_V213_STATE','GMWW_V212_STATE','GMWW_V211_STATE','GMWW_V210_STATE','GMWW_V209_STATE','GMWW_V208_STATE','GMWW_V207_STATE','GMWW_V206_STATE','GMWW_V205_STATE','GMWW_V109_STATE','GMWW_V1_09_STATE','GMWW_V108_STATE'];
const OLD_PREF_KEYS=['GMWW_V257_PREFS','GMWW_V256_PREFS','GMWW_V255_PREFS','GMWW_V254_PREFS','GMWW_V253_PREFS','GMWW_V252_PREFS','GMWW_V251_PREFS','GMWW_V250_PREFS','GMWW_V247_PREFS','GMWW_V246_PREFS','GMWW_V245_PREFS','GMWW_V244_PREFS','GMWW_V243_PREFS','GMWW_V242_PREFS','GMWW_V241_PREFS','GMWW_V240_PREFS','GMWW_V239_PREFS','GMWW_V238_PREFS','GMWW_V237_PREFS','GMWW_V236_PREFS','GMWW_V235_PREFS','GMWW_V234_PREFS','GMWW_V233_PREFS','GMWW_V232_PREFS','GMWW_V231_PREFS','GMWW_V230_PREFS','GMWW_V229_PREFS','GMWW_V228_PREFS','GMWW_V227_PREFS','GMWW_V226_PREFS','GMWW_V225_PREFS','GMWW_V224_PREFS','GMWW_V223_PREFS','GMWW_V222_PREFS','GMWW_V221_PREFS','GMWW_V220_PREFS','GMWW_V219_PREFS','GMWW_V218_PREFS','GMWW_V217_PREFS','GMWW_V216_PREFS','GMWW_V215_PREFS','GMWW_V214_PREFS','GMWW_V213_PREFS','GMWW_V212_PREFS','GMWW_V211_PREFS','GMWW_V210_PREFS','GMWW_V209_PREFS','GMWW_V208_PREFS','GMWW_V207_PREFS','GMWW_V206_PREFS','GMWW_V205_PREFS','GMWW_V109_PREFS','GMWW_V1_09_PREFS','GMWW_V108_PREFS'];
const DB_NAME='GMWW_V208_THEME_ASSETS';
const DB_STORE='assets';
const LEGACY_V1_ASSET_DBS=['GMWW_ASSETS_921','GMWW_THEME_ASSETS_946','GMWW_THEME_UI_987','GMWW_MATCH_CACHE_933','GMWW_AUDIO_LIBRARY'];

const THEME_UI_GROUPS=[
  // Only publish controls with an actual consumer in applyActiveThemeUi.
  {id:'background',title:'🌌 Hình nền đang sử dụng',slots:[
    ['bg.home','Nền Trang Chủ'],['bg.play','Nền Chơi'],
    ['bg.library','Nền Thư Viện'],['bg.settings','Nền Cài Đặt']
  ]},
  {id:'home',title:'🏝️ Hình ảnh Trang Chủ',slots:[
    ['banner.home','Banner Làng Biển'],
    ['ui.homePortal','Hình Nút Vào Làng'],
    ['ui.exploreDeck','Khám Phá • Bộ Bài'],
    ['ui.exploreMembers','Khám Phá • Thành Viên'],
    ['ui.exploreTemplates','Khám Phá • Ván Mẫu'],
    ['ui.bottomNavArt','Hình Thanh Điều Hướng']
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
const DEFAULT_ROLE_ID_SET=new Set((DEFAULT_STATE.cards||[]).map(x=>String(x.id||'')));
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
async function migrateLegacyV1Assets(){
  const marker='GMWW_V1_ASSET_MIGRATION_V258';if(localStorage.getItem(marker)==='done'||typeof indexedDB?.databases!=='function')return;
  const names=new Set((await indexedDB.databases()).map(x=>String(x?.name||'')));let copied=0;
  for(const name of LEGACY_V1_ASSET_DBS){if(!names.has(name))continue;let legacy;
    try{legacy=await new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});for(const storeName of Array.from(legacy.objectStoreNames)){const rows=await new Promise((resolve,reject)=>{const tx=legacy.transaction(storeName,'readonly'),store=tx.objectStore(storeName),values=store.getAll(),keys=store.getAllKeys();tx.oncomplete=()=>resolve({values:values.result||[],keys:keys.result||[]});tx.onerror=()=>reject(tx.error)});for(let i=0;i<rows.values.length;i++){const value=rows.values[i],key=String(value?.key??rows.keys[i]??'');const blob=value instanceof Blob?value:value?.blob instanceof Blob?value.blob:null;if(key&&blob&&!(await dbGet(key))){await dbPut(key,blob);copied++}}}}catch(e){console.warn('V1 asset migration skipped',name,e)}finally{try{legacy?.close()}catch(_){}}
  }
  localStorage.setItem(marker,'done');localStorage.setItem(marker+'_COUNT',String(copied));
}
function cardBlobKey(themeId,kind,id,assetKind){return 'v225|'+themeId+'|'+kind+'|'+id+'|'+assetKind}
function uiBlobKey(themeId,slotId){return themeId+'|ui|'+slotId}
async function blobUrlFor(key){if(objectUrls.has(key))return objectUrls.get(key);try{const rec=await dbGet(key);if(rec&&rec.blob){const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u}}catch(_){}return''}
function imageToThumb(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>{const sw=im.naturalWidth||1024,sh=im.naturalHeight||936,tries=[[300,275,.72],[260,238,.66],[220,202,.58],[180,165,.52]];let last='';for(const [w,h,q] of tries){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,w,h);const scale=Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);last=c.toDataURL('image/webp',q);if(last.length<=100000){resolve(last);return}}resolve(last)};im.onerror=()=>resolve('');im.src=src})}
async function ensureDefaultThumb(){if(defaultThumb)return defaultThumb;defaultThumb='default-artwork.webp';return defaultThumb}
function builtinRoleArtwork(id,assetKind){
  const item=window.GMWW_BUILTIN_ROLE_ARTWORK?.[String(id)];
  if(!item)return '';
  if(assetKind==='thumb')return item.thumb;
  if(assetKind==='delivery')return item.delivery||item.display;
  return item.display;
}
async function resolveArtwork(kind,id,assetKind){
  const builtIn=kind==='cards'?builtinRoleArtwork(id,assetKind):'';
  if(builtIn)return builtIn;
  // Built-in Vai Trò must never fall back to old persisted artwork. If the clean
  // canonical package is missing, show the neutral placeholder instead of a stale card.
  if(kind==='cards'&&DEFAULT_ROLE_ID_SET.has(String(id))){
    if(assetKind==='thumb')return await ensureDefaultThumb();
    return 'default-artwork.webp';
  }
  const active=state.themes.activeId||'theme-sea';
  if(active!=='theme-default'){
    const local=await blobUrlFor(cardBlobKey(active,kind,id,assetKind));if(local)return local;
    if(assetKind==='thumb'||assetKind==='full'){
      const displayLocal=await blobUrlFor(cardBlobKey(active,kind,id,'display'));if(displayLocal)return displayLocal;
    }
  }
  if(assetKind==='thumb')return await ensureDefaultThumb();
  return 'default-artwork.webp';
}

async function resolveUiSlot(themeId,slotId){const local=await blobUrlFor(uiBlobKey(themeId,slotId));if(local)return local;const t=themeById(themeId),u=String(t.ui?.[slotId]?.url||'').trim();return u}

// Exactly these slots have image consumers. Hidden legacy slot values are
// preserved in state/IndexedDB; only nonfunctional *controls* disappear.
const ACTIVE_THEME_BACKGROUND_TARGETS={
  'bg.home':'#home',
  'bg.play':'#start',
  'bg.library':'#library',
  'bg.settings':'#settings'
};
const ACTIVE_THEME_IMAGE_TARGETS={
  'banner.home':'#home .gmww-home-scene-image-v350',
  'ui.homePortal':'#gmwwHomeEnterVillage .gmww-home-portal-art-v352',
  'ui.exploreDeck':'#home [data-home-library-tab="cards"] img',
  'ui.exploreMembers':'#home [data-home-destination="members"] img',
  'ui.exploreTemplates':'#home [data-home-library-tab="templates"] img'
};
const ACTIVE_THEME_NAV_TARGETS={'ui.bottomNavArt':'#bottomNav'};
let activeThemeApplyToken=0;
// Decorative navigation artwork must be wide enough for the dock; phone screenshots
// or exported UI posters include duplicated interactive icons and must not be applied.
function navArtworkHasCorrectRatio(src){
  return new Promise(resolve=>{
    const image=new Image();let complete=false;
    const settle=ok=>{if(complete)return;complete=true;clearTimeout(timeout);resolve(ok);};
    const timeout=setTimeout(()=>settle(false),1500);
    image.onload=()=>settle(image.naturalHeight>0&&image.naturalWidth/image.naturalHeight>=6&&image.naturalWidth/image.naturalHeight<=12);
    image.onerror=()=>settle(false);
    image.src=src;
  });
}
function themeImageUrl(value){return 'url("'+String(value).replace(/["\\\n\r]/g,'')+'")'}
function defaultThemeSlotPreview(slot){
  const selector=ACTIVE_THEME_IMAGE_TARGETS[slot];
  if(!selector)return '';
  const img=document.querySelector(selector);
  return img?.dataset.themeDefaultSrc||img?.getAttribute('src')||'';
}
async function applyActiveThemeUi(){
  const id=state.themes.activeId||'theme-sea',token=++activeThemeApplyToken;
  const targets=[
    ...Object.keys(ACTIVE_THEME_BACKGROUND_TARGETS),
    ...Object.keys(ACTIVE_THEME_IMAGE_TARGETS),
    ...Object.keys(ACTIVE_THEME_NAV_TARGETS)
  ];
  const assets=await Promise.all(targets.map(async slot=>[slot,await resolveUiSlot(id,slot)]));
  if(token!==activeThemeApplyToken)return;
  for(const [slot,src] of assets){
    const selector=ACTIVE_THEME_BACKGROUND_TARGETS[slot];
    if(selector){
      const el=$(selector);if(!el)continue;
      // Several Home/Settings CSS backgrounds are !important: a plain inline
      // style silently loses the cascade, making the editor appear disconnected.
      if(src){
        el.style.setProperty('background-image','linear-gradient(rgba(3,12,21,.50),rgba(3,12,21,.70)),'+themeImageUrl(src),'important');
        el.style.setProperty('background-size','cover','important');
        el.style.setProperty('background-position','center','important');
      }else{
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
      }
      continue;
    }
    const imageSelector=ACTIVE_THEME_IMAGE_TARGETS[slot];
    if(imageSelector){
      const img=$(imageSelector);if(!img)continue;
      if(!img.dataset.themeDefaultSrc)img.dataset.themeDefaultSrc=img.getAttribute('src')||'';
      img.setAttribute('src',src||img.dataset.themeDefaultSrc);
      continue;
    }
    const navSelector=ACTIVE_THEME_NAV_TARGETS[slot];
    if(navSelector){
      const el=$(navSelector);if(!el)continue;
      // Reject narrow screenshot-like artwork (which can already contain nav labels/icons).
      // The navigation itself is rendered by real, accessible buttons.
      const usable=src ? await navArtworkHasCorrectRatio(src) : false;
      if(token!==activeThemeApplyToken)return;
      if(usable){
        el.style.setProperty('background-image',themeImageUrl(src),'important');
        el.style.setProperty('background-size','100% 100%','important');
        el.style.setProperty('background-position','center','important');
        el.removeAttribute('data-nav-art-rejected');
      }else{
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
        if(src)el.setAttribute('data-nav-art-rejected','wrong-ratio');
        else el.removeAttribute('data-nav-art-rejected');
      }
    }
  }
}

function entityTileHtml(kind,e){
  const p=prefFor(kind,e.id),sub=kind==='cards'?(factionMeta(e.factionId).icon+' '+factionMeta(e.factionId).label):'✦ ARTIFACTS';
  return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-kind="'+kind+'" data-id="'+esc(e.id)+'"><div class="tile-actions"><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button></div><img data-thumb-kind="'+kind+'" data-thumb-id="'+esc(e.id)+'" alt=""><h3>'+esc(e.name)+'</h3><small>'+esc(sub)+(p.hidden?' • Tạm ẩn':'')+'</small></article>'
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
  const raw={id,name:isCard?'Vai Trò Mới':'ARTIFACT Mới',information:'',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]};
  if(isCard)raw.factionId='village';else raw.artifact={ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''};
  const e=normalizeEntity(raw,kind);entityList(kind).unshift(e);prefFor(kind,id);ensureAudioPlaceholder(kind,e);saveState();savePrefs();renderEntityGrid(kind);openEntityEditor(kind,id);
}
function renderEntityGrid(kind){
  const grid=$(kind==='cards'?'#cardGrid':'#artifactGrid'),favGrid=$(kind==='cards'?'#cardFavoriteGrid':'#artifactFavoriteGrid'),filter=kind==='cards'?cardFilter:artifactFilter;
  const all=entityList(kind);
  const favorites=all.filter(e=>{const p=prefFor(kind,e.id);return p.starred&&!p.hidden}).sort((a,b)=>(prefFor(kind,a.id).starOrder||999999)-(prefFor(kind,b.id).starOrder||999999));
  const visibleTotal=all.filter(e=>!prefFor(kind,e.id).hidden).length;
  const countEl=$(kind==='cards'?'#cardFaceCount':'#artifactFaceCount');if(countEl){countEl.textContent=favorites.length+' / '+visibleTotal;countEl.setAttribute('aria-label',(kind==='cards'?'Thường dùng '+favorites.length+' Vai Trò, tổng '+visibleTotal+' Vai Trò':'Thường dùng '+favorites.length+' Artifact, tổng '+visibleTotal+' Artifact'))}
  favGrid.innerHTML=favorites.length?favorites.map(e=>entityTileHtml(kind,e)).join(''):'<div class="favorite-empty">Chưa có Vai Trò được đánh ★</div>';
  if(favorites.length)bindEntityTiles(kind,favGrid,favorites);
  let list=all.filter(e=>{const p=prefFor(kind,e.id);if(filter==='hidden')return p.hidden;return !p.hidden&&!p.starred});
  list.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
  const add='<button class="role-tile entity-add-tile" data-add-entity="'+kind+'" aria-label="Thêm"><span>＋</span><b>'+(kind==='cards'?'Thêm Vai Trò':'Thêm ARTIFACT')+'</b></button>';
  grid.innerHTML=add+list.map(e=>entityTileHtml(kind,e)).join('');
  bindEntityTiles(kind,grid,list);
  const addBtn=$('[data-add-entity="'+kind+'"]',grid);if(addBtn)addBtn.onclick=()=>createEntity(kind);
}

function togglePref(kind,id,type){const p=prefFor(kind,id);if(type==='star'){if(p.starred){p.starred=false;p.starOrder=null}else{p.hidden=false;p.starred=true;const orders=Object.values(prefs[kind]||{}).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);p.starOrder=Math.max(0,...orders)+1}}else{p.hidden=!p.hidden;if(p.hidden){p.starred=false;p.starOrder=null}}savePrefs();renderEntityGrid(kind)}

async function renderEntityFront(){
  const e=editDraft;if(!e)return;const card=$('#playerCard'),badge=$('#playerFactionBadge');
  card.className='player-card '+(currentKind==='artifacts'?'artifact':(e.factionId||'village'));
  $('#playerName').textContent=(e.name||'').toUpperCase();
  if(currentKind==='cards'){const f=factionMeta(e.factionId);badge.textContent=f.icon;badge.setAttribute('aria-label',f.label)}else{badge.textContent='✦';badge.setAttribute('aria-label','Artifacts')}
  $('#playerInformation').textContent=formatInformation(e.information||'');
  $('#playerDisplay').src=await resolveArtwork(currentKind,e.id,'display');
  fitPlayerCardTitle();fitPlayerCardInformation();
}
function fitPlayerCardTitle(){
  const title=$('#playerName');if(!title)return;
  title.style.fontSize='';
  if(typeof requestAnimationFrame!=='function')return;
  requestAnimationFrame(()=>{let size=25;while(size>18&&title.scrollWidth>title.clientWidth+1){size=Math.max(18,size-.5);title.style.fontSize=size+'px'}});
}
function fitPlayerCardInformation(){
  const box=$('#playerInformation');if(!box)return;
  box.style.fontSize='';
  if(typeof requestAnimationFrame!=='function')return;
  requestAnimationFrame(()=>{let size=14.5;while(size>12&&box.scrollHeight>box.clientHeight+1){size=Math.max(12,size-.5);box.style.fontSize=size+'px'}});
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
  $('#entitySettingsTitle').textContent=currentKind==='cards'?'Cài đặt Vai Trò':'Cài đặt ARTIFACTS';
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
function updateEntityHideButton(){const b=$('#hideEntity');if(!b||!currentId)return;const hidden=!!prefFor(currentKind,currentId).hidden;b.textContent=hidden?'◉':'◌';b.title=hidden?'Hiện lại':'Ẩn';b.setAttribute('aria-label',hidden?'Hiện lại':'Ẩn');b.classList.toggle('on',hidden)}
function toggleCurrentEntityHidden(){if(!currentId)return;togglePref(currentKind,currentId,'hide');updateEntityHideButton()}
function openEntityEditor(kind,id){currentKind=kind;currentId=id;const src=entityById(kind,id);if(!src)return;editDraft=normalizeEntity(src,kind);editBackRendered=false;$('#libraryHome').classList.add('hidden');$('#entityEditor').classList.remove('hidden');updateEntityHideButton();setFace('front');renderEntityFront();$('#library').scrollTop=0}
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
  for(const group of THEME_UI_GROUPS){const sec=document.createElement('details');sec.className='theme-section theme-collapsible';sec.innerHTML='<summary class="theme-section-head"><h3>'+esc(group.title)+'</h3></summary><div class="theme-slot-list"></div>';sections.appendChild(sec);const list=$('.theme-slot-list',sec);for(const [slotId,label] of group.slots){const src=await resolveUiSlot(themeId,slotId);const row=document.createElement('div');row.className='theme-slot';row.dataset.slotId=slotId;row.innerHTML='<img class="theme-slot-preview" alt=""><div class="theme-slot-main"><b>'+esc(label)+'</b><input type="url" placeholder="Link ảnh (không bắt buộc)" value="'+esc(themeById(themeId).ui?.[slotId]?.url||'')+'"></div><div class="theme-slot-actions"><button data-upload-slot="'+esc(slotId)+'" title="Tải ảnh">↑</button><button data-clear-slot="'+esc(slotId)+'" title="Mặc định">↺</button></div>';$('.theme-slot-preview',row).src=src||defaultThemeSlotPreview(slotId)||'';$('.theme-slot-preview',row).title=src?'Ảnh đang áp dụng':'Ảnh mặc định (đã liên kết)';list.appendChild(row);$('input',row).onchange=()=>saveUiSlotUrl(themeId,slotId,$('input',row).value);$('[data-upload-slot]',row).onclick=()=>pickUiSlotFile(themeId,slotId);$('[data-clear-slot]',row).onclick=()=>clearUiSlot(themeId,slotId)}}
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
function pickEntityThemeArtwork(themeId,kind,entityId){pickFile(async f=>{const dk=cardBlobKey(themeId,kind,entityId,'display'),tk=cardBlobKey(themeId,kind,entityId,'thumb');await dbPut(dk,f);await dbPut(tk,await thumbBlobFromFile(f));objectUrls.delete(dk);objectUrls.delete(tk);saveState();memberAdminState.loaded=false;await renderTheme();renderEntityGrid(kind)})}
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
  $$('.libtab').forEach(b=>b.onclick=()=>{$$('.libtab').forEach(x=>x.classList.toggle('active',x===b));$$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));$('#library').scrollTop=0;if(b.dataset.lib==='themes')renderTheme();if(b.dataset.lib==='audio')renderAudio();if(b.dataset.lib==='templates')loadPlayGameTemplates()});
  $$('[data-filter-kind]').forEach(row=>$$('.filter',row).forEach(b=>b.onclick=()=>{$$('.filter',row).forEach(x=>x.classList.toggle('active',x===b));if(row.dataset.filterKind==='cards')cardFilter=b.dataset.filter;else artifactFilter=b.dataset.filter;renderEntityGrid(row.dataset.filterKind)}));
  const addGameTemplateBtn=$('#addGameTemplate');if(addGameTemplateBtn)addGameTemplateBtn.onclick=()=>openLibraryGameTemplate('');
  const topBack=$('#topBackEntity');if(topBack)topBack.onclick=closeEntityEditor;$('#backEntity').onclick=closeEntityEditor;$('#saveEntity').onclick=saveEntity;$('#hideEntity').onclick=toggleCurrentEntityHidden;$('#deleteEntity').onclick=deleteEntity;
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
async function boot(){try{await migrateLegacyV1Assets()}catch(e){console.warn('V1 settings migration failed',e)}bindCore();bindFaceSwipe();renderEntityGrid('cards');renderEntityGrid('artifacts');renderActions();renderEffects();renderAudio();try{await ensureDefaultThumb()}catch(e){console.warn('Default artwork init failed',e)}try{await renderTheme()}catch(e){console.warn('Theme render failed',e)}try{await applyActiveThemeUi()}catch(e){console.warn('Theme apply failed',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

/* V2.76 — discrete actor-only character scale; UI geometry stays fixed */
const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200];
function normalizeCharacterScale(value,fallback=100){
  const n=Number(value);if(!Number.isFinite(n))return fallback;
  return CHARACTER_SCALE_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALE_OPTIONS[0])
}
function applyCharacterScale(value){
  const n=normalizeCharacterScale(value,100),root=document.documentElement;
  root?.style?.setProperty('--gmww-background-dim','0');
  root?.style?.setProperty('--gmww-character-scale',String(n/100));
  document.querySelectorAll('[data-character-scale]').forEach(btn=>{
    const active=Number(btn.dataset.characterScale)===n;
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false')
  });
  const out=document.getElementById('characterScaleValue');if(out)out.textContent=n+'%';
  return n
}
async function saveCharacterScale(value){
  const n=applyCharacterScale(value);
  try{
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/ui-settings',{method:'PUT',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:JSON.stringify({characterScale:n}),cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
  }catch(err){console.warn('GMWW_CHARACTER_SCALE_SAVE',err)}
}
async function initCharacterScaleSetting(){
  const choices=document.getElementById('characterScaleChoices');if(!choices)return;
  let n=100;
  try{const res=await fetch(GMWW_SERVER_BASE+'/api/ui-settings?ts='+Date.now(),{cache:'no-store'}),d=await res.json();if(res.ok&&Number.isFinite(Number(d?.characterScale)))n=Number(d.characterScale)}catch(err){console.warn('GMWW_CHARACTER_SCALE_LOAD',err)}
  applyCharacterScale(n);
  choices.addEventListener('click',event=>{const btn=event.target.closest('[data-character-scale]');if(btn)saveCharacterScale(btn.dataset.characterScale)});
}
setTimeout(initCharacterScaleSetting,0);

/* V2.22 — Server Health in Cài Đặt */
const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';
const GMWW_GM_AUTH="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
let gmwwGmPresenceTimer=null,gmwwGmPresenceState=null;
const GMWW_GM_AUTO_MOVE_MS=6500,GMWW_GM_AUTO_HOLD_MS=15000,GMWW_GM_AUTO_CYCLE_MS=GMWW_GM_AUTO_MOVE_MS+GMWW_GM_AUTO_HOLD_MS,GMWW_GM_AUTO_POINTS=[[25,37],[40,35],[60,35],[75,39],[82,55],[74,77],[60,86],[40,86],[25,77],[17,58],[31,64],[51,73],[69,64],[66,45],[43,44],[34,55]];
function gmwwGmHash(text){let h=2166136261>>>0;for(const ch of String(text||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
function gmwwGmAutoPoint(session,index){let h=gmwwGmHash(session+':'+index),base=GMWW_GM_AUTO_POINTS[h%GMWW_GM_AUTO_POINTS.length],prev=GMWW_GM_AUTO_POINTS[gmwwGmHash(session+':'+Math.max(0,index-1))%GMWW_GM_AUTO_POINTS.length];if(index>0&&base===prev)base=GMWW_GM_AUTO_POINTS[(h+5)%GMWW_GM_AUTO_POINTS.length];return{x:Math.max(15,Math.min(85,base[0]+((h>>>8)%5)-2)),y:Math.max(35,Math.min(88,base[1]+((h>>>16)%5)-2))}}
function gmwwGmActorAt(now=Date.now()){
  const p=gmwwGmPresenceState;if(!p?.online)return null;const manualUntil=Math.max(0,Number(p.manualUntil||0)),ms=Math.max(0,Number(p.moveStartedAt||0)),md=Math.max(0,Number(p.moveDurationMs||0));
  if(manualUntil>now&&ms>0&&md>0&&[p.moveFromX,p.moveFromY,p.moveToX,p.moveToY].every(v=>Number.isFinite(Number(v)))){const moving=now<ms+md,t=Math.max(0,Math.min(1,(now-ms)/Math.max(1,md))),from={x:Number(p.moveFromX),y:Number(p.moveFromY)},to={x:Number(p.moveToX),y:Number(p.moveToY)};return{moving,gait:moving?'run':'idle',x:moving?from.x+(to.x-from.x)*t:to.x,y:moving?from.y+(to.y-from.y)*t:to.y,from,to,status:moving?'GM ĐANG DI CHUYỂN':'GM ONLINE'}}
  const base=manualUntil>0?manualUntil:Math.max(1,Number(p.sessionStartedAt||p.lastSeenAt||now)),seed=manualUntil>0?(String(p.sessionId||base)+':after:'+manualUntil):String(p.sessionId||base),elapsed=Math.max(0,now-base),segment=Math.floor(elapsed/GMWW_GM_AUTO_CYCLE_MS),within=elapsed%GMWW_GM_AUTO_CYCLE_MS,anchor=manualUntil>0&&Number.isFinite(Number(p.moveToX))&&Number.isFinite(Number(p.moveToY))?{x:Number(p.moveToX),y:Number(p.moveToY)}:null,from=segment===0&&anchor?anchor:gmwwGmAutoPoint(seed,segment),to=gmwwGmAutoPoint(seed,segment+1),moving=within<GMWW_GM_AUTO_MOVE_MS,t=Math.max(0,Math.min(1,within/GMWW_GM_AUTO_MOVE_MS));return{moving,gait:moving?'walk':'idle',x:moving?from.x+(to.x-from.x)*t:to.x,y:moving?from.y+(to.y-from.y)*t:to.y,from,to,status:moving?'GM ĐANG TUẦN TRA':'GM ONLINE'}
}
async function gmwwSendGmPresence(online=true){
  try{
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/presence',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:JSON.stringify({online:online!==false,roomCode:online!==false&&isLivePlayRoom()?String(playSceneState.roomCode||''):null}),cache:'no-store',keepalive:true}),d=await res.json();if(res.ok){
      gmwwGmPresenceState=d?.gm||null;
      const generation=Math.max(0,Number(d?.lobbyGeneration||0));
      if(generation>Number(playSceneState.lobbyGeneration||0)&&!playSceneRuntime.busy){
        const mustReturn=isLivePlayRoom()||playSceneState.step!=='lobby';
        playApplyLobbyStage(generation);
        if(mustReturn)gmwwSendGmPresence(true);
      }
      if(typeof renderPlayPlayers==='function'&&document.getElementById('playPlayerRing'))renderPlayPlayers();
    }
  }catch(_){}
}
async function gmwwMoveGmCharacter(x,y){
  const actor=gmwwGmActorAt(Date.now()),from=actor?{x:actor.x,y:actor.y}:{x:50,y:76};
  try{const res=await fetch(GMWW_SERVER_BASE+'/api/gm/move',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:JSON.stringify({fromX:from.x,fromY:from.y,x,y,roomCode:isLivePlayRoom()?String(playSceneState.roomCode||''):null}),cache:'no-store'}),d=await res.json();if(!res.ok)throw new Error(d?.message||d?.error||('HTTP '+res.status));gmwwGmPresenceState=d?.gm||gmwwGmPresenceState;renderPlayPlayers();syncPlayMovementTicker();return true}catch(err){playFlashError('Không di chuyển được GM. '+(err?.message||''));return false}
}
function gmwwStartGmPresence(){
  gmwwSendGmPresence(true);
  if(gmwwGmPresenceTimer)clearInterval(gmwwGmPresenceTimer);
  gmwwGmPresenceTimer=setInterval(()=>{if(document.visibilityState!=='hidden')gmwwSendGmPresence(true)},20000);
}
setTimeout(gmwwStartGmPresence,0);
window.addEventListener('pagehide',()=>{gmwwSendGmPresence(false)});

/* UPDATE MANAGER V1 — prepared off-main */
let gmwwUpdateManifest=null,gmwwUpdateBusy=false;

/* Chỉ hiển thị phần trăm đã xác nhận; iOS cũ không trả tiến độ theo byte. */
function gmwwSetUpdateProgress(status='idle',percent=null,label=''){
  const root=document.getElementById('updateProgress'),fill=document.getElementById('updateProgressFill'),
        value=document.getElementById('updateProgressPercent'),title=document.getElementById('updateProgressTitle');
  if(!root)return;
  const valid=typeof percent==='number'&&Number.isFinite(percent);
  const n=valid?Math.max(0,Math.min(100,Math.round(percent))):null;
  root.dataset.state=status;
  if(valid){root.setAttribute('aria-valuenow',String(n));root.removeAttribute('aria-valuetext')}
  else{root.removeAttribute('aria-valuenow');root.setAttribute('aria-valuetext','Đang tải, chưa có dữ liệu phần trăm thực tế')}
  if(fill)fill.style.width=valid?n+'%':'0%';
  if(value)value.textContent=valid?n+'%':'—';
  if(title)title.textContent=label||({idle:'Chưa bắt đầu',running:'Đang thực hiện…',done:'Đã hoàn tất',error:'Có lỗi khi thực hiện'}[status]||'');
}
const gmwwRuntimeVersion=()=>String(VERSION||'').replace(/^V/i,'');
const gmwwShellVersion=()=>String(window.GMWW_NATIVE_SHELL_VERSION||VERSION||'').replace(/^V/i,'');
function gmwwVersionParts(v){return String(v||'').replace(/^V/i,'').split('.').map(x=>Math.max(0,Number.parseInt(x,10)||0))}
function gmwwVersionCompare(a,b){const aa=gmwwVersionParts(a),bb=gmwwVersionParts(b),n=Math.max(aa.length,bb.length);for(let i=0;i<n;i++){const d=(aa[i]||0)-(bb[i]||0);if(d)return d>0?1:-1}return 0}
function gmwwNativePost(action,payload={}){
  try{const h=window.webkit?.messageHandlers?.gmwwUpdater;if(!h)return false;h.postMessage({action,...payload});return true}catch(e){console.warn('GMWW_NATIVE_UPDATE_BRIDGE',e);return false}
}
function setUpdateUi(kind,status,message,detail=''){
  const dot=document.getElementById('updateDot'),pill=document.getElementById('updateStatus'),msg=document.getElementById('updateMessage'),det=document.getElementById('updateDetail');
  if(dot)dot.className='update-dot '+kind;
  if(pill){pill.className='update-pill '+kind;pill.textContent=status}
  if(msg)msg.textContent=message||'';
  if(det){const repeated=/^(?:Bản cập nhật|Có gì mới)\s*:/.test(String(detail||''));det.textContent=repeated?'':detail||'';det.hidden=repeated||!detail;}
  const put=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  put('updateShellVersion','V'+gmwwShellVersion());
  put('updateRuntimeVersion','V'+gmwwRuntimeVersion());
}
function setUpdateAction(kind,context={}){
  const runtime=document.getElementById('installRuntimeUpdate'),ipa=document.getElementById('downloadNewIPA'),web=document.getElementById('syncPlayerWebUpdate');
  const title=document.getElementById('updateDecisionTitle'),hint=document.getElementById('updateDecisionHint');
  const buttons=[runtime,ipa,web];buttons.forEach(x=>{if(!x)return;x.classList.remove('recommended');x.disabled=false;x.removeAttribute('aria-disabled')});
  const enable=x=>{if(!x)return;x.disabled=false;x.removeAttribute('aria-disabled');x.classList.add('recommended')};
  const shell=String(context.shell||gmwwShellVersion()),runtimeV=String(context.runtime||gmwwRuntimeVersion()),latest=String(context.latest||runtimeV),ipaV=String(context.ipaVersion||'').replace(/^V/i,'');
  if(kind==='runtime'){enable(runtime);if(title)title.textContent='Cần cập nhật Runtime lên V'+latest;if(hint)hint.textContent='Nhấn CẬP NHẬT RUNTIME. Không cần tải IPA mới.'}
  else if(kind==='native'){enable(ipa);if(title)title.textContent='Bắt buộc cài IPA V'+latest;if(hint)hint.textContent='Nhấn TẢI IPA. Cập nhật Runtime không thay thế được phiên bản ứng dụng này.'}
  else if(kind==='server_only'){enable(web);if(title)title.textContent='Chỉ Player Web/Server cần đồng bộ';if(hint)hint.textContent='Ứng dụng GM không cần cập nhật hoặc tải IPA.'}
  else if(kind==='compatible'){if(title)title.textContent='GMWW đang ở phiên bản mới nhất.';if(hint)hint.textContent='Không cần làm gì • Ứng dụng V'+shell+' vẫn tương thích với Runtime/Server V'+runtimeV+'.'}
  else if(kind==='restart'){if(title)title.textContent='Chỉ cần khởi động lại ứng dụng';if(hint)hint.textContent='IPA V'+shell+' đã có sẵn; không tải lại IPA.'}
  else if(kind==='pending'){if(title)title.textContent='Server đang phát hành bản cập nhật.';if(hint)hint.textContent='Chưa có gói Runtime sẵn sàng. Không cần nhấn Cập nhật lúc này.'}
  else if(kind==='unverified'){if(title)title.textContent='Chưa xác minh được phiên bản mới nhất.';if(hint)hint.textContent='Không kết luận đã cập nhật xong khi Server hoặc gói cập nhật chưa phản hồi. Nhấn ↻ để kiểm tra lại.'}
  else {if(title)title.textContent='GMWW đang ở phiên bản mới nhất.';if(hint)hint.textContent='Không cần làm gì • Hệ thống đang ở trạng thái phù hợp.'}
}
async function installRuntimeUpdate(){
  if(gmwwUpdateBusy||!gmwwUpdateManifest)return false;
  const files=gmwwUpdateManifest?.runtime?.files;
  if(!Array.isArray(files)||!files.length){setUpdateUi('warn','KHÔNG CÓ GÓI DỮ LIỆU','Không có gói Runtime cần cài.','Nếu cần bản ứng dụng mới, chọn TẢI FILE IPA.');return false}
  gmwwUpdateBusy=true;gmwwSetUpdateProgress('running',null,'Đang tải Runtime • chờ dữ liệu thực tế');setUpdateUi('checking','ĐANG CẬP NHẬT','Đang tải và kiểm tra dữ liệu phiên bản mới…','Không tắt ứng dụng trong lúc cập nhật.');
  if(!gmwwNativePost('installRuntime',{manifest:gmwwUpdateManifest})){
    gmwwUpdateBusy=false;gmwwSetUpdateProgress('error',null,'Ứng dụng chưa hỗ trợ cập nhật');setUpdateUi('bad','KHÔNG HỖ TRỢ','Bản ứng dụng hiện tại chưa có Update Manager.','Chọn TẢI FILE IPA để cài bản có Update Manager.');return false
  }
  return true
}
function downloadUpdateIPA(){
  const manifestIpa=gmwwUpdateManifest?.ipa||{},version=String(manifestIpa.version||'').replace(/^V/i,''),url=String(manifestIpa.url||'').trim(),fileName=String(manifestIpa.fileName||'').trim();
  if(!version||!url||!fileName){
    setUpdateUi('warn','CHƯA CÓ IPA','Server chưa công bố file IPA mới để tải.','Không tải lại IPA cũ trong máy.');
    return false;
  }
  gmwwSetUpdateProgress('running',null,'Đang tải IPA • chờ dữ liệu thực tế');
  setUpdateUi('checking','ĐANG TẢI IPA','Đang tải IPA V'+version,'');
  if(!gmwwNativePost('downloadIPA',{url,fileName,version}))window.location.assign(url);
  return true;
}
async function updateDataNow(){
  const btn=document.getElementById('installRuntimeUpdate');if(btn)btn.disabled=true;
  try{
    const d=await checkAppUpdate({notify:false});if(!d)return;
    const latest=String(d.releaseVersion||d.runtimeVersion||d.serverVersion||'').replace(/^V/i,''),type=String(d.releaseType||'server_only').toLowerCase(),newer=gmwwVersionCompare(latest,gmwwRuntimeVersion())>0;
    if(newer&&type==='runtime'){await installRuntimeUpdate();return}
    if(newer&&type==='native'){setUpdateAction('native',{latest});setUpdateUi('warn','CẦN FILE IPA','Phiên bản V'+latest+' cần cài ứng dụng mới.','Chọn TẢI FILE IPA.');return}
    gmwwSetUpdateProgress('running',0,'Đang cập nhật dữ liệu thành viên và máy chủ');
    memberAdminState.loaded=false;await loadMembers(true);await checkServerHealth();
    gmwwSetUpdateProgress('done',100,'Dữ liệu đã cập nhật');
    setUpdateUi('ok','DỮ LIỆU ĐÃ CẬP NHẬT','Dữ liệu Server hiện tại đã được tải lại.','Không cần cài lại IPA.');
  }catch(e){console.warn('GMWW_UPDATE_DATA',e);gmwwSetUpdateProgress('error',null,'Không thể cập nhật dữ liệu');setUpdateUi('bad','CẬP NHẬT LỖI','Không cập nhật được dữ liệu.',String(e?.message||'Vui lòng thử lại.'))}
  finally{if(btn&&!gmwwUpdateBusy)btn.disabled=false}
}
async function syncPlayerWebUpdate(){
  const btn=document.getElementById('syncPlayerWebUpdate');if(btn)btn.disabled=true;
  gmwwSetUpdateProgress('running',0,'Đang gửi yêu cầu đồng bộ Web');
  setUpdateUi('checking','ĐANG ĐỒNG BỘ','Đang gửi tín hiệu đồng bộ tới Player Web…','');
  try{
    const stamp=Date.now();
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/web-sync?ts='+stamp,{
      method:'POST',
      headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},
      body:JSON.stringify({source:'GM_APP',runtimeVersion:gmwwRuntimeVersion()}),
      cache:'no-store'
    });
    let d={};try{d=await res.json()}catch{}
    if(!res.ok||d.ok!==true)throw new Error(d.message||d.error||('HTTP '+res.status));
    const webVersion=String(d.webVersion||d.version||'').replace(/^V/i,'');
    const serverEl=document.getElementById('updateServerVersion');if(serverEl&&webVersion)serverEl.textContent='V'+webVersion;
    gmwwSetUpdateProgress('done',100,'Máy chủ đã xác nhận đồng bộ Web');
    setUpdateAction('none');setUpdateUi('ok','WEB ĐÃ ĐỒNG BỘ','Player Web đã nhận tín hiệu đồng bộ V'+(webVersion||'—')+'.','Người chơi đang mở web cũ sẽ được yêu cầu tải lại trang.');
  }catch(e){console.warn('GMWW_SYNC_PLAYER_WEB',e);gmwwSetUpdateProgress('error',null,'Đồng bộ Web không thành công');setUpdateUi('bad','ĐỒNG BỘ LỖI','Không đồng bộ được Player Web.',String(e?.message||'Vui lòng thử lại.'))}
  finally{if(btn)btn.disabled=false}
}
/* Validate both release metadata and Worker health before claiming "latest". */
let gmwwUpdateCheckSerial=0;
async function gmwwUpdateProbe(path){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
    try{
      const res=await fetch(GMWW_SERVER_BASE+path,{method:'GET',cache:'no-store',signal:controller.signal});
      let body=null;try{body=await res.json()}catch{}
      if(!res.ok||!body||body.ok!==true){
        const error=new Error(String(body?.error||body?.message||('HTTP '+res.status)));
        error.code=String(body?.error||'');error.status=res.status;
        throw error;
      }
      return body;
    }catch(error){lastError=error}
    finally{clearTimeout(timer)}
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));
  }
  throw lastError||new Error('Không nhận được phản hồi');
}
function gmwwVersionVerified(v){return /^\d+\.\d+(?:\.\d+)?$/.test(String(v||'').replace(/^V/i,''))}
function gmwwReleaseNotesList(manifest){
  const notes=Array.isArray(manifest?.releaseNotes)
    ?manifest.releaseNotes.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];
  const current=gmwwRuntimeVersion(), latest=String(manifest?.releaseVersion||manifest?.runtimeVersion||'').replace(/^V/i,'');
  if(!latest||gmwwVersionCompare(latest,current)<=0)return ['Không có thay đổi mới so với phiên bản đang sử dụng.'];
  const previous=String(manifest?.previousVersion||manifest?.fromVersion||'').replace(/^V/i,'');
  if(previous&&gmwwVersionCompare(previous,current)!==0)return ['Phiên bản V'+latest+' có bản cập nhật mới. Chưa có ghi chú riêng cho bước nâng cấp từ V'+current+'.'];
  return notes.length?notes.slice(0,6):['Có bản cập nhật V'+latest+'. Chưa có ghi chú thay đổi riêng cho phiên bản này.'];
}
function gmwwReleaseNotesText(manifest){return gmwwReleaseNotesList(manifest).join(' • ')}
function gmwwRenderReleaseNotes(manifest){
  const box=document.getElementById('updateReleaseNotes');if(!box)return;
  const title=document.createElement('b');title.className='update-release-title';title.textContent='Có gì mới';
  const list=document.createElement('ul');list.className='update-release-list';
  for(const note of gmwwReleaseNotesList(manifest)){
    const item=document.createElement('li');item.textContent=note;list.appendChild(item);
  }
  box.replaceChildren(title,list);
}
async function checkAppUpdate({notify=false}={}){
  if(gmwwUpdateBusy)return null;
  const serial=++gmwwUpdateCheckSerial,retry=document.getElementById('retryUpdateCheck'),serverEl=document.getElementById('updateServerVersion');
  if(retry){retry.disabled=true;retry.setAttribute('aria-busy','true')}
  if(serverEl)serverEl.textContent='V—';
  setUpdateAction('unverified');
  setUpdateUi('checking','ĐANG KIỂM TRA','Đang đối chiếu Server và gói cập nhật…','');
  try{
    const stamp=Date.now(),[manifestResult,healthResult]=await Promise.allSettled([
      gmwwUpdateProbe('/api/update/manifest?current='+encodeURIComponent(gmwwRuntimeVersion())+'&ts='+stamp),
      gmwwUpdateProbe('/api/health?update='+stamp)
    ]);
    if(serial!==gmwwUpdateCheckSerial)return null;
    const manifest=manifestResult.status==='fulfilled'?manifestResult.value:null;
    const health=healthResult.status==='fulfilled'?healthResult.value:null;
    const server=String(health?.serverVersion||health?.version||'').replace(/^V/i,'');
    const latest=String(manifest?.releaseVersion||manifest?.runtimeVersion||'').replace(/^V/i,'');
    const serverValid=health?.project==='GMWW-V2.00'&&gmwwVersionVerified(server);
    const manifestValid=gmwwVersionVerified(latest)&&['runtime','native','server_only'].includes(String(manifest?.releaseType||'').toLowerCase());
    if(serverEl)serverEl.textContent=serverValid?'V'+server:'V—';
    // Never retain a previously fetched manifest after a failed version check.
    gmwwUpdateManifest=null;
    if(!serverValid||!manifestValid){
      const publishing=serverValid&&manifestResult.status==='rejected'&&
        ['RUNTIME_MANIFEST_NOT_READY','UPDATE_MANIFEST_NOT_FOUND'].includes(String(manifestResult.reason?.code||''));
      if(publishing){
        setUpdateAction('pending');
        setUpdateUi('checking','ĐANG PHÁT HÀNH','Server V'+server+' đã chạy nhưng gói cập nhật chưa sẵn sàng.','Chưa cần nhấn Cập nhật. Hệ thống sẽ kiểm tra lại khi bạn mở ứng dụng hoặc bấm ↻.');
        return null;
      }
      const cause=!serverValid?'Chưa xác minh được kết nối Server.':'Chưa đọc được gói cập nhật Runtime.';
      const retryInfo=!serverValid?healthResult.reason:manifestResult.reason;
      console.warn('GMWW_UPDATE_UNVERIFIED',cause,retryInfo||'');
      setUpdateAction('unverified');
      setUpdateUi('warn','CẦN KIỂM TRA LẠI',cause,'Phiên bản Runtime V'+gmwwRuntimeVersion()+' đang chạy. Nhấn ↻ để thử lại; chưa thể kết luận đây là bản mới nhất.');
      return null;
    }
    const manifestServer=String(manifest.serverVersion||latest).replace(/^V/i,'');
    if(!gmwwVersionVerified(manifestServer)||gmwwVersionCompare(manifestServer,server)!==0){
      setUpdateAction('unverified');
      setUpdateUi('warn','SERVER CHƯA ĐỒNG BỘ','Server V'+server+' và kênh cập nhật V'+manifestServer+' chưa khớp.','Nhấn ↻ kiểm tra lại sau khi hệ thống đồng bộ.');
      return null;
    }
    gmwwUpdateManifest=manifest;
    gmwwRenderReleaseNotes(manifest);
    const type=String(manifest.releaseType).toLowerCase(),runtime=gmwwRuntimeVersion(),shell=gmwwShellVersion();
    const newer=gmwwVersionCompare(latest,runtime)>0,shellCurrent=gmwwVersionCompare(shell,latest)>=0;
    if(shellCurrent&&gmwwVersionCompare(runtime,shell)<0){
      setUpdateAction('restart',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CẦN KHỞI ĐỘNG LẠI','Ứng dụng V'+shell+' đã cài nhưng Runtime V'+runtime+' vẫn đang mở.','Đóng hẳn ứng dụng rồi mở lại một lần.');
      return manifest
    }
    if(!newer){
      setUpdateAction(gmwwVersionCompare(shell,runtime)<0?'compatible':'none',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','ĐÃ ĐỒNG BỘ','Game Runtime V'+runtime+' · Server V'+server+'.','');
      return manifest
    }
    if(type==='native'&&shellCurrent){
      setUpdateAction('none',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','ĐÃ CÀI IPA','Đã cài IPA V'+shell,'Phiên bản IPA hiện tại.');
      return manifest
    }
    if(type==='native'){
      setUpdateAction('native',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CẦN IPA MỚI','Có IPA V'+latest+' mới.','Nhấn TẢI IPA để cài phiên bản ứng dụng.');
    }else if(type==='runtime'){
      setUpdateAction('runtime',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CÓ CẬP NHẬT','Có GMWW V'+latest+' mới.','Cập nhật Game Runtime để nhận thay đổi.');
    }else{
      setUpdateAction('server_only',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','SERVER ĐÃ CẬP NHẬT','Server/Player Web đã lên V'+latest+'.','Tải lại Player Web để xem thay đổi.');
    }
    if(notify&&newer){
      const key='GMWW_UPDATE_NOTIFIED_'+latest+'_'+type;
      if(!sessionStorage.getItem(key)){
        sessionStorage.setItem(key,'1');
        if(type==='runtime'){
          if(confirm('Có phiên bản GMWW V'+latest+' mới.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nCập nhật ngay?'))installRuntimeUpdate();
        }else if(type==='native'){
          if(confirm('Có phiên bản IPA V'+latest+' mới.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nTải IPA V'+latest+' ngay?'))downloadUpdateIPA();
        }else{
          if(confirm('Player Web/Server V'+latest+' đã cập nhật.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nĐồng bộ ngay?'))syncPlayerWebUpdate();
        }
      }
    }
    return manifest
  }catch(e){
    if(serial!==gmwwUpdateCheckSerial)return null;
    gmwwUpdateManifest=null;setUpdateAction('unverified');
    setUpdateUi('warn','CẦN KIỂM TRA LẠI','Chưa xác nhận được bản cập nhật.','Kiểm tra kết nối rồi nhấn ↻ để thử lại. Game hiện tại vẫn có thể hoạt động.');
    console.warn('GMWW_UPDATE_CHECK',e);
    return null
  }finally{
    if(serial===gmwwUpdateCheckSerial&&retry){retry.disabled=false;retry.removeAttribute('aria-busy')}
  }
}
window.GMWWUpdateNative={
  onProgress(event={}){
    // Đọc tiến độ thật chỉ khi trình tải bản địa cung cấp dữ liệu hợp lệ.
    if(!['installRuntime','downloadIPA'].includes(String(event.action||'')))return;
    const percent=Number(event.percent);
    if(!Number.isFinite(percent)||event.percent===null||event.percent===undefined)return;
    gmwwSetUpdateProgress('running',percent,event.action==='installRuntime'?'Đang cài Runtime':'Đang tải IPA');
  },
  onResult(result={}){
    gmwwUpdateBusy=false;
    if(result.ok&&result.action==='installRuntime'){
      gmwwSetUpdateProgress('done',100,'Đã tải và cài Runtime');
      const v=String(result.version||gmwwUpdateManifest?.releaseVersion||'mới');
      setUpdateUi('ok','ĐÃ CẬP NHẬT','Đã cài GMWW V'+String(v).replace(/^V/i,'')+'.','Có gì mới: '+gmwwReleaseNotesText(gmwwUpdateManifest));
      setTimeout(()=>{if(!gmwwNativePost('restartRuntime'))window.location.reload()},300);
      return
    }
    if(result.ok&&result.action==='downloadIPA'){
      gmwwSetUpdateProgress('done',100,'Đã tải xong IPA');
      setUpdateUi('ok','ĐÃ TẢI IPA','File IPA đã sẵn sàng.','Chọn Lưu vào Tệp hoặc ứng dụng cài đặt trong bảng chia sẻ.');
      return
    }
    if(result.ok===false){gmwwSetUpdateProgress('error',null,'Tác vụ không thành công');setUpdateUi('bad','CẬP NHẬT LỖI','Không thể hoàn tất cập nhật.',String(result.error||'Đã giữ nguyên phiên bản hiện tại.'));}
  }
};

let serverHealthBusy=false;
function setServerHealthState(kind,text,detail,data={}){
  const pill=document.getElementById('serverHealthPill'),dot=document.getElementById('serverHealthDot');
  if(pill){pill.className='health-pill '+kind;pill.textContent=kind==='ok'?'HOẠT ĐỘNG TỐT':kind==='warn'?'CÓ CẢNH BÁO':kind==='bad'?'MẤT KẾT NỐI':'ĐANG KIỂM TRA'}
  if(dot)dot.className='health-dot '+kind;
  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put('serverHealthText',text);put('serverHealthDetail',detail);
  put('healthPlayerWeb',data.web||'—');put('healthApi',data.api||'—');put('healthLatency',data.latency||'—');put('healthVersion',data.version||'—');
  put('healthCheckedAt',new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}));
}
async function checkServerHealth(){
  if(serverHealthBusy)return; serverHealthBusy=true;
  const btn=document.getElementById('checkServerHealth');if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.classList.add('is-busy')}
  setServerHealthState('checking','Đang kiểm tra…','Đang kiểm tra Server và Player Web');
  const started=performance.now();
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000),stamp=Date.now();
    const [healthRes,webRes]=await Promise.all([
      fetch(GMWW_SERVER_BASE+'/api/health?ipa='+stamp,{method:'GET',cache:'no-store',signal:controller.signal}),
      fetch(GMWW_SERVER_BASE+'/api/web-sync?health='+stamp,{method:'GET',cache:'no-store',signal:controller.signal})
    ]);
    clearTimeout(timer);
    const latency=Math.max(1,Math.round(performance.now()-started));
    let body={},web={};try{body=await healthRes.json()}catch{}try{web=await webRes.json()}catch{}
    if(!healthRes.ok||body.ok!==true)throw new Error('HTTP '+healthRes.status);
    const webOk=webRes.ok&&web.ok===true,slow=latency>800,level=webOk&&!slow?'ok':'warn';
    setServerHealthState(level,level==='ok'?'Hoạt động tốt':slow?'Phản hồi chậm':'Player Web cần kiểm tra',
      webOk?(slow?'Server + Player Web Online • phản hồi đang chậm':'Server + Player Web sẵn sàng'):'Server Online • chưa xác nhận được Player Web',
      {web:webOk?'Online':'Cảnh báo',api:'Online',latency:latency+' ms',version:body.version||'—'});
  }catch(err){
    const latency=Math.max(1,Math.round(performance.now()-started));
    setServerHealthState('bad','Mất kết nối','Không xác nhận được Server/Player Web',{web:'—',api:'Offline',latency:latency+' ms',version:'—'});
  }finally{serverHealthBusy=false;if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.classList.remove('is-busy')}}
}
const retryUpdateCheck=document.getElementById('retryUpdateCheck');
if(retryUpdateCheck)retryUpdateCheck.addEventListener('click',()=>{void checkAppUpdate({notify:false})});
const refreshServerData=document.getElementById('refreshServerData');
if(refreshServerData)refreshServerData.addEventListener('click',async()=>{refreshServerData.disabled=true;try{memberAdminState.loaded=false;await loadMembers(true);await checkServerHealth()}finally{refreshServerData.disabled=false}});
const openPlayerWeb=document.getElementById('openPlayerWeb');
if(openPlayerWeb)openPlayerWeb.addEventListener('click',()=>window.location.assign(GMWW_SERVER_BASE+'/'));
const healthButton=document.getElementById('checkServerHealth');
if(healthButton)healthButton.addEventListener('click',checkServerHealth);
const installRuntimeUpdateBtn=document.getElementById('installRuntimeUpdate');if(installRuntimeUpdateBtn)installRuntimeUpdateBtn.addEventListener('click',updateDataNow);
const downloadNewIPA=document.getElementById('downloadNewIPA');if(downloadNewIPA)downloadNewIPA.addEventListener('click',downloadUpdateIPA);
const syncPlayerWebUpdateBtn=document.getElementById('syncPlayerWebUpdate');if(syncPlayerWebUpdateBtn)syncPlayerWebUpdateBtn.addEventListener('click',syncPlayerWebUpdate);
setTimeout(()=>checkAppUpdate({notify:true}),1400);
// Settings navigation stays lightweight; diagnostics and the GitHub board are loaded on demand.
document.querySelectorAll('[data-page="settings"]').forEach(el=>el.addEventListener('click',()=>gmwwSettingsHubHealth('idle','Chọn HEALTHY CHECK để kiểm tra')));
window.addEventListener('online',()=>{checkAppUpdate({notify:true});if(document.getElementById('settings')?.classList.contains('active')){checkServerHealth();if(gmwwOpsAutoEnabled())setTimeout(()=>gmwwOpsRun({kind:'all',silent:true}),330)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){gmwwSendGmPresence(true);setTimeout(()=>checkAppUpdate({notify:true}),250)}});

function setMaintenanceState(kind,text,detail){
  const pill=document.getElementById('maintenanceStatus'),dot=document.getElementById('maintenanceDot'),msg=document.getElementById('maintenanceDetail');
  if(pill){pill.className='maintenance-pill '+kind;pill.textContent=text}
  if(dot)dot.className='maintenance-dot '+kind;
  if(msg)msg.textContent=detail||'';
}
function auditLocalData(){
  const btn=document.getElementById('auditLocalData');if(btn)btn.disabled=true;
  try{
    const issues=[];
    const buckets=[['Vai Trò',state.cards],['Artifact',state.artifacts],['Hành Động Vai Trò',state.actions?.role],['Hành Động Artifact',state.actions?.artifacts],['Hiệu Ứng',state.effects]];
    for(const [label,list] of buckets){
      if(!Array.isArray(list)){issues.push(label+' lỗi cấu trúc');continue}
      const ids=list.map(x=>String(x?.id||'')).filter(Boolean),dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);
      if(dupes.length)issues.push(label+' trùng ID');
    }
    const total=(state.cards?.length||0)+(state.artifacts?.length||0)+(state.effects?.length||0);
    if(issues.length)setMaintenanceState('warn','CẦN KIỂM TRA',issues.slice(0,2).join(' • '));
    else setMaintenanceState('ok','ỔN','Dữ liệu hợp lệ • '+total+' mục chính');
  }catch(_){setMaintenanceState('bad','LỖI','Không thể kiểm tra dữ liệu.')}
  finally{if(btn)btn.disabled=false}
}
async function clearSafeRuntimeCache(){
  const btn=document.getElementById('clearRuntimeCache');if(btn)btn.disabled=true;
  setMaintenanceState('checking','ĐANG DỌN','Đang giải phóng cache tạm…');
  try{
    let released=0;
    for(const u of objectUrls.values()){try{URL.revokeObjectURL(u);released++}catch(_){}}
    objectUrls.clear();defaultThumb='';
    if('caches' in window){try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}catch(_){}}
    renderEntityGrid('cards');renderEntityGrid('artifacts');await applyActiveThemeUi();
    setMaintenanceState('ok','ĐÃ DỌN','Đã dọn cache tạm • giữ nguyên Artwork, Audio và dữ liệu game.');
  }catch(_){setMaintenanceState('warn','CHƯA XONG','Không dọn được toàn bộ cache tạm.')}
  finally{if(btn)btn.disabled=false}
}
const auditLocalDataBtn=document.getElementById('auditLocalData');if(auditLocalDataBtn)auditLocalDataBtn.addEventListener('click',auditLocalData);
const clearRuntimeCacheBtn=document.getElementById('clearRuntimeCache');if(clearRuntimeCacheBtn)clearRuntimeCacheBtn.addEventListener('click',clearSafeRuntimeCache);
const reloadAppBtn=document.getElementById('reloadApp');if(reloadAppBtn)reloadAppBtn.addEventListener('click',()=>window.location.reload());

/* V2.97 — self diagnostics for Server + Player Web */
let gmwwDiagnosticBusy=false,gmwwRuntimeErrors=[];
function gmwwCaptureRuntimeIssue(kind,message){
  const text=String(message||'Lỗi không xác định').replace(/\s+/g,' ').trim().slice(0,220);
  if(!text)return;
  gmwwRuntimeErrors.unshift({kind:String(kind||'runtime'),message:text,at:Date.now()});
  gmwwRuntimeErrors=gmwwRuntimeErrors.slice(0,8);
  if(document.getElementById('settings')?.classList.contains('active'))setDiagnosticState('warn','PHÁT HIỆN LỖI','Đã ghi nhận lỗi Runtime',text);
}
window.addEventListener('error',event=>gmwwCaptureRuntimeIssue('javascript',event?.message||event?.error?.message));
window.addEventListener('unhandledrejection',event=>gmwwCaptureRuntimeIssue('promise',event?.reason?.message||event?.reason));

function setDiagnosticState(kind,status,summary,detail=''){
  const dot=document.getElementById('diagnosticDot'),pill=document.getElementById('diagnosticStatus'),sum=document.getElementById('diagnosticSummary'),hint=document.getElementById('diagnosticHint'),det=document.getElementById('diagnosticDetail');
  if(dot)dot.className='diagnostic-dot '+kind;
  if(pill){pill.className='diagnostic-pill '+kind;pill.textContent=status}
  if(sum)sum.textContent=summary||'';
  if(hint)hint.textContent=kind==='ok'?'Server và Player Web đang hoạt động bình thường.':kind==='checking'?'Đang kiểm tra từng thành phần…':'Hệ thống đã khoanh vùng mục cần xử lý.';
  if(det)det.textContent=detail||'';
}
function renderDiagnosticItem(key,kind,text){
  const row=document.querySelector('#diagnosticList [data-diagnostic="'+key+'"]');if(!row)return;
  row.className=kind||'';const out=row.querySelector('b');if(out)out.textContent=text||'—';
}
async function gmwwJsonProbe(path,validate=()=>true,timeout=7000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout),started=performance.now();
  try{
    const res=await fetch(GMWW_SERVER_BASE+path,{cache:'no-store',signal:controller.signal});
    let data={};try{data=await res.json()}catch{}
    const valid=res.ok&&validate(data,res)!==false;
    return{ok:valid,status:res.status,data,latency:Math.max(1,Math.round(performance.now()-started)),error:valid?'':String(data?.error||data?.message||('HTTP '+res.status))}
  }catch(err){return{ok:false,status:0,data:{},latency:Math.max(1,Math.round(performance.now()-started)),error:String(err?.name==='AbortError'?'Timeout':err?.message||'Network error')}}
  finally{clearTimeout(timer)}
}
async function runSystemDiagnostics({silent=false}={}){
  if(gmwwDiagnosticBusy)return null;gmwwDiagnosticBusy=true;
  const btn=document.getElementById('runSystemDiagnostics');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  if(!silent)setDiagnosticState('checking','ĐANG QUÉT','Đang quét Server + Player Web…','5 nhóm kiểm tra');
  ['server','player','update','characters','settings'].forEach(k=>renderDiagnosticItem(k,'','…'));
  try{
    if(navigator.onLine===false){
      ['server','player','update','characters','settings'].forEach(k=>renderDiagnosticItem(k,'bad','OFFLINE'));
      setDiagnosticState('bad','MẤT MẠNG','Thiết bị đang Offline.','Kết nối mạng rồi chạy lại Health Check.');
      return{ok:false,offline:true}
    }
    const stamp=Date.now();
    const [server,player,update,characters,settings]=await Promise.all([
      gmwwJsonProbe('/api/health?diag='+stamp,d=>d?.ok===true&&d?.project==='GMWW-V2.00'),
      gmwwJsonProbe('/api/web-sync?diag='+stamp,d=>d?.ok===true),
      gmwwJsonProbe('/api/update/manifest?diag='+stamp,d=>d?.ok===true&&!!d?.releaseVersion),
      gmwwJsonProbe('/api/game-characters?diag='+stamp,d=>Array.isArray(d?.characters)&&d.characters.length>=20),
      gmwwJsonProbe('/api/ui-settings?diag='+stamp,()=>true)
    ]);
    const probes={server,player,update,characters,settings};
    for(const [key,result] of Object.entries(probes))renderDiagnosticItem(key,result.ok?'ok':'bad',result.ok?'OK':(result.error||'LỖI').slice(0,18));
    const failures=Object.entries(probes).filter(([,v])=>!v.ok);
    const warnings=[];
    const m=update.data||{},runtime=String(m.runtimeVersion||''),shell=String(m.shellVersion||''),type=String(m.releaseType||'');
    if(update.ok&&runtime&&shell&&runtime!==shell&&type!=='runtime')warnings.push('Kênh cập nhật chưa đúng loại Runtime');
    if(server.ok&&server.latency>800)warnings.push('Server phản hồi chậm '+server.latency+' ms');
    if(gmwwRuntimeErrors.length)warnings.push('Runtime ghi nhận '+gmwwRuntimeErrors.length+' lỗi gần đây');
    if(failures.length){
      setDiagnosticState('bad','PHÁT HIỆN LỖI',failures.length+' thành phần chưa đạt',failures.map(([k,v])=>k+': '+(v.error||'Lỗi')).slice(0,2).join(' • '));
      return{ok:false,failures,warnings,probes}
    }
    if(warnings.length){
      setDiagnosticState('warn','CÓ CẢNH BÁO','5/5 thành phần kết nối được',warnings.slice(0,2).join(' • '));
      return{ok:true,warnings,probes}
    }
    setDiagnosticState('ok','HỆ THỐNG TỐT','5/5 kiểm tra đạt','Health Check hoàn tất • '+server.latency+' ms');
    return{ok:true,warnings:[],probes}
  }finally{gmwwDiagnosticBusy=false;if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function quickRepairSystem(){
  if(gmwwDiagnosticBusy)return;
  const btn=document.getElementById('quickRepairSystem');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  setDiagnosticState('checking','ĐANG SỬA','Đang thực hiện sửa lỗi an toàn…','Dọn cache tạm • tải lại dữ liệu • đồng bộ Player Web');
  try{
    await clearSafeRuntimeCache();
    memberAdminState.loaded=false;
    try{await loadMembers(true)}catch(_){}
    await syncPlayerWebUpdate();
    await checkAppUpdate({notify:false});
    await checkServerHealth();
    gmwwRuntimeErrors=[];
    const result=await runSystemDiagnostics({silent:true});
    if(result?.ok)setDiagnosticState(result.warnings?.length?'warn':'ok',result.warnings?.length?'CÒN CẢNH BÁO':'ĐÃ SỬA XONG',result.warnings?.length?'Các kết nối đã phục hồi, còn cảnh báo cần theo dõi.':'Server + Player Web đã được kiểm tra lại.',result.warnings?.slice(0,2).join(' • ')||'Không xoá dữ liệu game.');
  }catch(err){setDiagnosticState('bad','SỬA LỖI THẤT BẠI','Không hoàn tất được sửa nhanh.',String(err?.message||'Vui lòng thử lại.'))}
  finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function checkPlayerWebNow(){
  const btn=document.getElementById('checkPlayerWebNow');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  try{
    await syncPlayerWebUpdate();
    await runSystemDiagnostics({silent:false});
  }finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
const runSystemDiagnosticsBtn=document.getElementById('runSystemDiagnostics');if(runSystemDiagnosticsBtn)runSystemDiagnosticsBtn.addEventListener('click',()=>runSystemDiagnostics({silent:false}));
const quickRepairSystemBtn=document.getElementById('quickRepairSystem');if(quickRepairSystemBtn)quickRepairSystemBtn.addEventListener('click',quickRepairSystem);
const checkPlayerWebNowBtn=document.getElementById('checkPlayerWebNow');if(checkPlayerWebNowBtn)checkPlayerWebNowBtn.addEventListener('click',checkPlayerWebNow);
setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('settings')?.classList.contains('active')){if(gmwwOpsAutoEnabled())gmwwOpsRun({kind:'all',silent:true});false /* Workboard refreshes only when requested */}},120000);


/* GMWW Settings: one continuous scrolling screen with consistent health status. */
function gmwwSettingsHubHealth(kind,message){
  const box=document.getElementById('settingsHubMiniHealth'),label=document.getElementById('settingsHubMiniText');
  if(box)box.dataset.status=kind||'idle';
  if(label)label.textContent=message||'Chưa kiểm tra';
}

/* GMWW Operations Center — Cài Đặt. Read-only health, room & release checks; no credential exposure. */
const GMWW_OPS_AUTO_KEY='GMWW_OPS_AUTO_CHECK_V1';
let gmwwOpsBusy=false,gmwwOpsSnapshot=null;
function gmwwOpsAutoEnabled(){
  try{return localStorage.getItem(GMWW_OPS_AUTO_KEY)==='1'}catch{return false}
}
function gmwwOpsLine(key,kind,label,note){
  const el=document.querySelector('#opsReport [data-ops-check="'+key+'"]');
  if(!el)return;
  el.className=kind||'idle';
  const badge=el.querySelector('b'),caption=el.querySelector('small');
  if(badge)badge.textContent=label||'—';
  if(caption)caption.textContent=note||'';
}
function gmwwOpsTop(key,value,kind){
  const el=document.getElementById(key);
  if(el){el.textContent=value||'—';el.dataset.status=kind||'idle'}
}
function gmwwOpsResult(kind,label,note,extra={}){
  return {kind,label,note,...extra};
}
function gmwwOpsServerPart(server,deep){
  const v=String(server?.data?.version||'');
  if(!server?.ok)return gmwwOpsResult('bad','LỖI SERVER','Không thể truy cập Cloudflare Worker.',{http:server?.status||0});
  if(!deep?.ok||deep?.data?.checks?.memberStorage!=='ready')
    return gmwwOpsResult('bad','LỖI DỮ LIỆU','Durable Objects chưa sẵn sàng.',{http:deep?.status||0,version:v});
  return gmwwOpsResult('ok','ỔN ĐỊNH','Worker '+v+' • phản hồi '+server.latency+' ms',{http:server.status,latencyMs:server.latency,version:v});
}
function gmwwOpsRoomSnapshot(){
  const selected=typeof isLivePlayRoom==='function'&&isLivePlayRoom();
  if(!selected||!playSceneState?.roomCode)
    return {room:gmwwOpsResult('idle','CHƯA CHỌN','Chưa có phòng được chọn trong Trang Chơi.'),
      realtime:gmwwOpsResult('idle','CHƯA KẾT NỐI','Chưa có phòng để đo kết nối realtime.'),
      players:0,seats:0,online:0};
  const room=playSceneRuntime?.room||{},members=Array.isArray(playSceneRuntime?.players)?playSceneRuntime.players:[],
    online=members.filter(p=>p?.online!==false).length,
    seatCount=Math.max(0,Math.min(30,Number(room?.seatCount||playSceneState?.seatCount||0))),
    socket=playSceneRuntime?.socket,
    socketOpen=!!socket&&socket.readyState===1,
    lastSync=Number(playSceneRuntime?.lastSyncAt||0),
    syncAgeSec=lastSync>0?Math.max(0,Math.floor((Date.now()-lastSync)/1000)):null,
    mode=String(room?.roomMode||playSceneState?.roomMode||'').toUpperCase(),
    enabled=room?.enabled!==false;
  return {
    room:gmwwOpsResult(enabled?'ok':'warn',enabled?'PHÒNG ON':'PHÒNG OFF',
      mode+' • '+members.length+'/'+seatCount+' vị trí • '+online+' online',
      {mode,enabled,participants:members.length,seats:seatCount,online}),
    realtime:socketOpen?gmwwOpsResult(syncAgeSec!==null&&syncAgeSec>90?'warn':'ok',syncAgeSec!==null&&syncAgeSec>90?'CHẬM ĐỒNG BỘ':'ĐÃ KẾT NỐI',
      'WebSocket đang mở'+(syncAgeSec===null?'':' • cập nhật '+syncAgeSec+' giây trước'),{socketOpen,syncAgeSec})
      :gmwwOpsResult('warn','CHƯA KẾT NỐI','Mở Trang Chơi để kết nối realtime; không tự reset phòng.',{socketOpen:false,syncAgeSec})
  };
}
function gmwwOpsDraw(snapshot){
  if(!snapshot)return;
  const states=snapshot.checks||{};
  for(const [key,value] of Object.entries(states))gmwwOpsLine(key,value.kind,value.label,value.note);
  gmwwOpsTop('opsServerState',states.server?.label,states.server?.kind);
  gmwwOpsTop('opsStorageState',states.storage?.label,states.storage?.kind);
  gmwwOpsTop('opsRealtimeState',states.realtime?.label,states.realtime?.kind);
  gmwwOpsTop('opsReleaseState',states.update?.label,states.update?.kind);
  const values=Object.values(states),failed=values.filter(v=>v?.kind==='bad'),
    warned=values.filter(v=>v?.kind==='warn'),
    overall=failed.length?'bad':warned.length?'warn':'ok',
    label=failed.length?'PHÁT HIỆN LỖI':warned.length?'CẦN CHÚ Ý':'HỆ THỐNG ỔN';
  const dot=document.getElementById('opsDot'),pill=document.getElementById('opsOverall'),advice=document.getElementById('opsAdvice'),
    time=document.getElementById('opsLastChecked');
  if(dot)dot.className='ops-dot '+overall;
  if(pill){pill.className='ops-pill '+overall;pill.textContent=label}
  if(advice)advice.textContent=failed.length?'Có '+failed.length+' mục gặp lỗi. Xem chi tiết bên dưới; có thể sử dụng SỬA NHANH ở mục Tự chẩn đoán.'
    :warned.length?'Có '+warned.length+' cảnh báo. Kiểm tra trạng thái phòng và phiên bản trước khi chơi.'
    :'Kiểm tra đạt. Không cần xoá cache, reset phòng hoặc cài lại IPA.';
  if(time)time.textContent='Lần kiểm tra: '+new Date(snapshot.checkedAt).toLocaleString('vi-VN')+' • Chỉ đọc, không thay đổi dữ liệu game.';
  if(typeof gmwwSettingsHubHealth==='function')gmwwSettingsHubHealth(overall,
    failed.length?failed.length+' lỗi cần kiểm tra':warned.length?warned.length+' cảnh báo':'Server & game hoạt động tốt');
}
async function gmwwOpsRun({kind='all',silent=false}={}){
  if(gmwwOpsBusy)return gmwwOpsSnapshot;
  gmwwOpsBusy=true;
  const buttonId=kind==='room'?'opsCheckRoom':kind==='release'?'opsCheckRelease':'opsRunFullAudit';
  const button=document.getElementById(buttonId);
  if(button)button.disabled=true;
  const overall=document.getElementById('opsOverall');
  if(overall&&!silent){overall.textContent='ĐANG KIỂM TRA';overall.className='ops-pill checking'}
  try{
    const checks={...(gmwwOpsSnapshot?.checks||{})},stamp=Date.now();
    const runAll=kind==='all',runRoom=runAll||kind==='room',runRelease=runAll||kind==='release';
    let server=null,deep=null,manifest=null;
    if(runAll||runRelease){
      const jobs=[
        gmwwJsonProbe('/api/health?ops='+stamp,d=>d?.ok===true&&d?.project==='GMWW-V2.00'),
        gmwwJsonProbe('/api/health/deep?ops='+stamp,d=>d?.ok===true&&d?.checks?.memberStorage==='ready'),
        gmwwJsonProbe('/api/update/manifest?ops='+stamp,d=>d?.ok===true&&!!d?.releaseVersion)
      ];
      if(runAll)jobs.push(gmwwJsonProbe('/api/web-sync?ops='+stamp,d=>d?.ok===true),
        gmwwJsonProbe('/api/game-characters?ops='+stamp,d=>Array.isArray(d?.characters)&&d.characters.length>=20));
      const results=await Promise.all(jobs);
      [server,deep,manifest]=results;
      const combination=gmwwOpsServerPart(server,deep);
      checks.server=server?.ok?gmwwOpsResult('ok','ONLINE','Cloudflare Worker '+String(server.data?.version||'')+' • '+server.latency+' ms',
        {http:server.status,latencyMs:server.latency,version:String(server.data?.version||'')})
        :gmwwOpsResult('bad','OFFLINE','Server không phản hồi hoặc sai cấu hình.',{http:server?.status||0});
      checks.storage=deep?.ok?gmwwOpsResult('ok','SẴN SÀNG','Durable Objects phản hồi • chỉ đọc dữ liệu.',
        {http:deep.status}):gmwwOpsResult('bad','KHÔNG SẴN SÀNG','Kiểm tra lưu trữ thất bại.',{http:deep?.status||0});
      const serverVersion=String(server?.data?.version||'').replace(/^V/i,'');
      const updateVersion=String(manifest?.data?.releaseVersion||'').replace(/^V/i,'');
      const aligned=manifest?.ok&&server?.ok&&serverVersion===updateVersion;
      const shell=typeof gmwwShellVersion==='function'?gmwwShellVersion():'—';
      const runtime=typeof gmwwRuntimeVersion==='function'?gmwwRuntimeVersion():'—';
      checks.update=aligned?gmwwOpsResult('ok','ĐỒNG BỘ','Server '+serverVersion+' • Runtime '+runtime+' • IPA '+shell,
        {serverVersion,releaseVersion:updateVersion,runtimeVersion:runtime,shellVersion:shell,http:manifest.status})
        :gmwwOpsResult('warn','KIỂM TRA LẠI','Server và kênh cập nhật chưa khớp, xem Cập Nhật Hệ Thống.',
          {serverVersion,releaseVersion:updateVersion,runtimeVersion:runtime,shellVersion:shell,http:manifest?.status||0});
      if(runAll){
        const [player,characters]=results.slice(3);
        checks.player=player?.ok?gmwwOpsResult('ok','HOẠT ĐỘNG','Player Web và trạng thái đồng bộ phản hồi • '+player.latency+' ms',
          {http:player.status,latencyMs:player.latency})
          :gmwwOpsResult('bad','LỖI KẾT NỐI','Player Web không phản hồi.',{http:player?.status||0});
        const count=Array.isArray(characters?.data?.characters)?characters.data.characters.length:0;
        checks.characters=characters?.ok?gmwwOpsResult('ok','SẴN SÀNG',count+' nhân vật trong manifest.',
          {http:characters.status,count}):gmwwOpsResult('warn','THIẾU DỮ LIỆU','Không đọc được đầy đủ danh sách nhân vật.',{http:characters?.status||0,count});
      }
    }
    if(runRoom){
      const state=gmwwOpsRoomSnapshot();
      checks.room=state.room;checks.realtime=state.realtime;
      if(state.room.kind!=='idle'&&playSceneState?.roomCode){
        const roomCheck=await gmwwJsonProbe('/api/rooms/'+encodeURIComponent(playSceneState.roomCode)+'?ops='+stamp,
          d=>d?.ok===true&&!!d?.room);
        if(!roomCheck.ok)checks.room=gmwwOpsResult('bad','KHÔNG ĐỒNG BỘ','Không truy xuất được phòng đã chọn.',{http:roomCheck.status});
        else{
          const actual=roomCheck.data;
          const participants=Array.isArray(actual?.players)?actual.players.length:0;
          const online=Array.isArray(actual?.players)?actual.players.filter(p=>p?.online!==false).length:0;
          const seatCount=Math.max(0,Math.min(30,Number(actual?.room?.seatCount)||0));
          checks.room=gmwwOpsResult(actual?.room?.enabled===false?'warn':'ok',actual?.room?.enabled===false?'PHÒNG OFF':'PHÒNG ON',
            String(actual?.room?.roomMode||'').toUpperCase()+' • '+participants+'/'+seatCount+' vị trí • '+online+' online',
            {http:roomCheck.status,mode:String(actual?.room?.roomMode||''),enabled:actual?.room?.enabled!==false,
              participants,seats:seatCount,online});
        }
      }
    }
    if(runAll){
      const errorCount=Array.isArray(gmwwRuntimeErrors)?gmwwRuntimeErrors.length:0;
      checks.runtime=gmwwOpsResult(errorCount?'warn':'ok',errorCount?errorCount+' CẢNH BÁO':'KHÔNG LỖI',
        errorCount?'Thiết bị ghi nhận '+errorCount+' lỗi gần đây.':'Chưa ghi nhận lỗi JavaScript gần đây.',
        {count:errorCount});
    }
    gmwwOpsSnapshot={checkedAt:new Date().toISOString(),checks};
    gmwwOpsDraw(gmwwOpsSnapshot);
    return gmwwOpsSnapshot;
  }catch(_){
    const advice=document.getElementById('opsAdvice');
    if(advice)advice.textContent='Không hoàn tất được chẩn đoán. Kiểm tra mạng rồi thử lại.';
    if(overall){overall.className='ops-pill bad';overall.textContent='KHÔNG KIỂM TRA ĐƯỢC'}
    return null;
  }finally{gmwwOpsBusy=false;if(button)button.disabled=false}
}
function gmwwOpsSafeReport(snapshot){
  if(!snapshot)return null;
  const fields=['kind','label','http','latencyMs','version','serverVersion','releaseVersion','runtimeVersion',
    'shellVersion','mode','enabled','participants','seats','online','socketOpen','syncAgeSec','count'];
  const checks={};
  for(const [key,row] of Object.entries(snapshot.checks||{})){
    checks[key]={};
    for(const f of fields)if(Object.prototype.hasOwnProperty.call(row,f))checks[key][f]=row[f];
  }
  return {project:'GMWW-V2.00',type:'read-only-operations-report',checkedAt:snapshot.checkedAt,
    clientVersion:String(VERSION||''),checks,
    privacy:'No names, login IDs, player positions, room codes, IPs, tokens, or card roles included.'};
}
function gmwwOpsInitialize(){
  const auto=document.getElementById('opsAutoCheck');
  if(auto){auto.checked=gmwwOpsAutoEnabled();auto.addEventListener('change',()=>{
    try{localStorage.setItem(GMWW_OPS_AUTO_KEY,auto.checked?'1':'0')}catch(_){}
    if(auto.checked)gmwwOpsRun({kind:'all',silent:true});
  })}
  document.getElementById('opsRunFullAudit')?.addEventListener('click',()=>gmwwOpsRun({kind:'all'}));
  document.getElementById('opsCheckRoom')?.addEventListener('click',()=>gmwwOpsRun({kind:'room'}));
  document.getElementById('opsCheckRelease')?.addEventListener('click',()=>gmwwOpsRun({kind:'release'}));
  document.getElementById('settingsRunHealth')?.addEventListener('click',async()=>{
    const button=document.getElementById('settingsRunHealth'),note=document.getElementById('settingsHealthSummary');
    if(button?.disabled)return;if(button)button.disabled=true;
    if(note)note.textContent='Đang kiểm tra bảo trì, Server, realtime và chẩn đoán…';
    try{auditLocalData();await gmwwOpsRun({kind:'all'});await checkServerHealth();await runSystemDiagnostics();if(note)note.textContent='Hoàn tất quét. Kết quả và cảnh báo hiển thị bên dưới.'}
    catch(e){if(note)note.textContent='Còn mục chưa kiểm tra: '+String(e?.message||'Vui lòng thử lại.')}
    finally{if(button)button.disabled=false}
  });
}
gmwwOpsInitialize();

/* Work backlog: only GitHub owners can close/reopen Issues; never embed write credentials. */
let gmwwTasksBusy=false,gmwwTasksLastLoaded=0,gmwwTaskReviewPending=false;
function gmwwTaskReviewLink(task,mode){
  const number=Number(task?.number);
  if(!Number.isSafeInteger(number)||number<=0)return null;
  const labels={
    completed:'✓ XÁC NHẬN HOÀN THÀNH',
    skipped:'↷ BỎ QUA',
    reopen:'↶ XEM / MỞ LẠI'
  };
  const link=document.createElement('a');
  link.className='gmww-task-review-link '+mode;
  link.href='https://github.com/WilliamPham0702/GMWW-V2.00/issues/'+number;
  link.target='_self';
  link.rel='noopener noreferrer';
  link.textContent=labels[mode]||'XEM CÔNG VIỆC';
  link.setAttribute('aria-label',(labels[mode]||'Xem công việc')+' #'+number+' trên GitHub');
  if(mode==='completed'||mode==='skipped'){
    link.addEventListener('click',event=>{
      const instruction=mode==='completed'
        ? 'Bạn xác nhận công việc #'+number+' đã đáp ứng yêu cầu và muốn chuyển sang Lịch sử hoàn tất?'
        : 'Bạn chọn BỎ QUA công việc #'+number+' và không cần tiếp tục triển khai?';
      if(!window.confirm(instruction+'\n\nỨng dụng sẽ mở GitHub. Đăng nhập tài khoản chủ dự án, chọn Close issue và lý do '+(mode==='completed'?'Completed (Hoàn thành).':'Not planned (Không thực hiện).')+'\n\nChỉ khi GitHub xác nhận đóng Issue thì trạng thái trên server mới thay đổi.')){
        event.preventDefault();return;
      }
      gmwwTaskReviewPending=true;
    });
  }
  return link;
}
function gmwwTaskReviewButtons(task){
  const actions=document.createElement('div');actions.className='gmww-task-review-actions';
  const open=['doing','pending'].includes(String(task.state||''));
  const modes=open?['completed','skipped']:['reopen'];
  for(const mode of modes){const link=gmwwTaskReviewLink(task,mode);if(link)actions.append(link)}
  return actions;
}
function gmwwTaskItem(task){
  const row=document.createElement('article');
  row.className='gmww-task-item '+String(task.state||'pending');
  const heading=document.createElement('div');heading.className='gmww-task-item-head';
  const title=document.createElement('b');title.textContent=String(task.title||'Công việc GMWW');
  const status=document.createElement('span');status.className='gmww-task-status '+String(task.state||'pending');
  status.textContent=task.state==='doing'?'ĐANG THỰC HIỆN':task.state==='completed'?'HOÀN TẤT':task.state==='skipped'?'ĐÃ BỎ QUA':task.state==='closed'?'ĐÃ ĐÓNG':'CHƯA HOÀN THÀNH';
  heading.append(title,status);row.append(heading);
  const description=document.createElement('p');description.textContent=String(task.summary||'Đã ghi nhận yêu cầu.');row.append(description);
  const meta=document.createElement('small');const priority=task.priority?String(task.priority)+' · ':'';
  meta.textContent=priority+'Công việc #'+Number(task.number||0)+' · Cập nhật '+(task.updatedAt?new Date(task.updatedAt).toLocaleDateString('vi-VN'):'—');
  row.append(meta);
  const actions=gmwwTaskReviewButtons(task);
  if(actions.childElementCount)row.append(actions);
  return row;
}
async function gmwwTasksRefresh({silent=false}={}){
  if(gmwwTasksBusy)return;
  gmwwTasksBusy=true;
  const refresh=document.getElementById('gmwwTasksReload'),summary=document.getElementById('gmwwTasksSummary'),
    openList=document.getElementById('gmwwTasksOpenList'),closedList=document.getElementById('gmwwTasksDoneList');
  if(refresh)refresh.disabled=true;
  if(summary&&!silent)summary.textContent='Đang cập nhật tiến độ công việc…';
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(GMWW_SERVER_BASE+'/api/operations/tasks?ts='+Date.now(),{method:'GET',cache:'no-store',signal:controller.signal});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    if(!data?.ok||!Array.isArray(data.open)||!Array.isArray(data.history))throw new Error('Danh sách không hợp lệ');
    const open=data.open.filter(x=>x.state==='pending'||x.state==='doing'),
      done=data.history.filter(x=>x.state==='completed'||x.state==='closed'||x.state==='skipped');
    if(openList){openList.replaceChildren();if(open.length)for(const task of open)openList.append(gmwwTaskItem(task));else{
      const blank=document.createElement('p');blank.className='gmww-task-empty';blank.textContent='Không có công việc chưa hoàn thành được ghi nhận.';openList.append(blank)}}
    if(closedList){closedList.replaceChildren();if(done.length)for(const task of done)closedList.append(gmwwTaskItem(task));else{
      const blank=document.createElement('p');blank.className='gmww-task-empty';blank.textContent='Chưa có công việc đóng được ghi nhận.';closedList.append(blank)}}
    const openCount=document.getElementById('gmwwTasksOpenCount'),doneCount=document.getElementById('gmwwTasksDoneCount');
    if(openCount)openCount.textContent=String(open.length);
    if(doneCount)doneCount.textContent=String(done.length);
    if(summary)summary.textContent=(data.fallback?'BẢN DỰ PHÒNG '+String(data.generatedAt||'')+' • ':'')+open.length+' công việc chưa hoàn thành · '+open.filter(x=>x.state==='doing').length+' đang thực hiện · '+done.length+' mục lịch sử (gồm Hoàn tất/Bỏ qua).';
    const reviewState=document.getElementById('gmwwTaskReviewHealth');
    if(reviewState){
      const rendered=openList?.querySelectorAll('.gmww-task-review-link.completed')?.length||0;
      const skipped=openList?.querySelectorAll('.gmww-task-review-link.skipped')?.length||0;
      const ready=(rendered===open.length&&skipped===open.length);
      reviewState.textContent=ready?'Bộ xác nhận V3.32 đã sẵn sàng · '+rendered+' công việc có nút Hoàn thành / Bỏ qua.'
        :'CẢNH BÁO: Bộ xác nhận chưa hiển thị đủ ('+rendered+'/'+open.length+'). Nhấn LÀM MỚI TIẾN ĐỘ.';
      reviewState.dataset.ready=ready?'true':'false';
    }
    gmwwTasksLastLoaded=Date.now();
  }catch(error){
    if(summary)summary.textContent='Chưa lấy được tiến độ. Nhấn LÀM MỚI TIẾN ĐỘ để thử lại.';
    const reviewState=document.getElementById('gmwwTaskReviewHealth');if(reviewState){reviewState.textContent='Chưa tải được công việc, không thể xác nhận. Thử LÀM MỚI TIẾN ĐỘ.';reviewState.dataset.ready='false'}
    if(!gmwwTasksLastLoaded&&openList){openList.replaceChildren();const p=document.createElement('p');p.className='gmww-task-empty';p.textContent='Nguồn công việc tạm thời không truy cập được; không thể xác nhận tiến độ.';openList.append(p)}
  }finally{clearTimeout(timeout);gmwwTasksBusy=false;if(refresh)refresh.disabled=false}
}
document.getElementById('gmwwTasksReload')?.addEventListener('click',()=>gmwwTasksRefresh());
function gmwwTaskReviewReturn(){
  if(!gmwwTaskReviewPending)return;
  if(!document.getElementById('settings')?.classList.contains('active'))return;
  gmwwTaskReviewPending=false;
  gmwwTasksLastLoaded=0;
  gmwwTasksRefresh({silent:false});
}

/* V2.97 — Thành Viên dùng Bộ 42 Nhân Vật game, không dùng thumbnail Artwork */
/* V2.29 — V1 Member management + Ranking + History */
window.addEventListener('focus',gmwwTaskReviewReturn);
window.addEventListener('pageshow',gmwwTaskReviewReturn);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')gmwwTaskReviewReturn()});
const memberAdminState={members:[],avatars:[],busy:false,loaded:false,tab:'directory',filter:'all',query:'',historyResult:'all',historyLogin:'',sheetMode:'',sheetMember:null,selectedAvatarId:'',characterPreviewTimer:null};

function gmHeaders(extra={}){return {...extra,Authorization:'Bearer '+GMWW_GM_AUTH}}
async function gmApi(path,opts={}){
  const headers=gmHeaders(opts.headers||{});
  if(opts.body!==undefined&&!headers['content-type'])headers['content-type']='application/json';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(GMWW_SERVER_BASE+path,{...opts,headers,cache:'no-store',signal:controller.signal});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok){const err=new Error(data.message||data.error||('HTTP '+res.status));err.status=res.status;err.code=data.error||'';throw err}
    return data;
  }finally{clearTimeout(timer)}
}
const MEMBER_CHARACTER_COUNT=42;
const MEMBER_ANIMATED_CHARACTER_COUNT=20;
function memberCharacterCatalog(serverRows=[]){
  const source=new Map((Array.isArray(serverRows)?serverRows:[]).map(x=>[String(x?.id||''),x]));
  return Array.from({length:MEMBER_CHARACTER_COUNT},(_,i)=>{
    const n=String(i+1).padStart(2,'0'),id='character-'+n,remote=source.get(id)||{};
    return{id,name:String(remote.name||('Nhân vật '+n)),imageUrl:GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(id)+'/image',frameCount:i<MEMBER_ANIMATED_CHARACTER_COUNT?6:1,source:'game-character'};
  });
}
function memberCharacterFrameUrl(id,frame=1){
  const raw=String(id||''),m=raw.match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/),f=Math.max(1,Math.min(6,Number(frame)||1));
  if(!m)return memberAvatarUrl(raw);
  return Number(m[1])<=MEMBER_ANIMATED_CHARACTER_COUNT
    ?GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/frame/'+f
    :GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/image';
}
function memberSelectedCharacterId(m){
  const direct=String(m?.gameCharacterId||m?.avatarId||'');
  if(/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(direct))return direct;
  const legacy=String(m?.avatarId||'').match(/^avatar-cut-(\d{3})$/i),n=legacy?Number(legacy[1]):0;
  if(n>=1&&n<=MEMBER_CHARACTER_COUNT)return 'character-'+String(n).padStart(2,'0');
  return memberAdminState.avatars[0]?.id||'character-01';
}
function ensureMemberCharacterPreviewStyle(){
  if(document.getElementById('gmwwMemberCharacterPreviewStyle'))return;
  const st=document.createElement('style');st.id='gmwwMemberCharacterPreviewStyle';
  st.textContent='@keyframes gmwwMemberCharacterFloat{from{transform:translateY(1px)}to{transform:translateY(-3px)}}#memberAvatarGrid .member-avatar-choice img{object-fit:contain!important}#memberAvatarGrid .member-avatar-choice img.member-character-static{animation:gmwwMemberCharacterFloat .7s ease-in-out infinite alternate}';
  document.head.appendChild(st);
}
function ensureMemberCharacterPreviewTicker(){
  if(memberAdminState.characterPreviewTimer)return;
  memberAdminState.characterPreviewTimer=setInterval(()=>{
    const frame=(Math.floor(performance.now()/120)%6)+1;
    document.querySelectorAll('#memberAvatarGrid img[data-member-character]').forEach(img=>{
      const id=String(img.dataset.memberCharacter||'');if(!id)return;
      const key=id+':'+frame;if(img.dataset.memberFrame===key)return;
      img.dataset.memberFrame=key;img.src=memberCharacterFrameUrl(id,frame);
    });
  },95);
}
function memberEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function memberTitleCase(v){return String(v||'').trim().replace(/\s+/g,' ').split(' ').map(w=>w?w.charAt(0).toLocaleUpperCase('vi-VN')+w.slice(1):w).join(' ')}
function memberAvatarUrl(id){const raw=String(id||'');return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(raw)?GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/image':GMWW_SERVER_BASE+'/api/avatars/'+encodeURIComponent(raw)+'/image'}
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
    const [dir,characters]=await Promise.all([
      gmApi('/api/gm/members'),
      fetch(GMWW_SERVER_BASE+'/api/game-characters?gm='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():({characters:[]})).catch(()=>({characters:[]}))
    ]);
    memberAdminState.members=Array.isArray(dir?.members)?dir.members:[];
    memberAdminState.avatars=memberCharacterCatalog(characters?.characters);
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
      '<button data-act="reset" type="button" aria-label="Đặt lại mật khẩu thành viên" title="Đặt lại mật khẩu">↻</button><button data-act="delete" class="danger-mini" type="button" aria-label="Xóa thành viên" title="Xóa tài khoản">✕</button></div>';
    const img=card.querySelector('.member-avatar');img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    card.querySelector('.member-card-main b').textContent=m.displayName||m.loginId;
    card.querySelector('.member-card-main small').textContent='@'+m.loginId;
    const status=card.querySelector('.member-status');status.textContent='';status.classList.toggle('online',!!m.online);
    status.setAttribute('aria-label',m.online?'Trực tuyến':'Ngoại tuyến');status.title=m.online?'Trực tuyến':'Ngoại tuyến';
    card.querySelector('.member-room').textContent=m.currentRoomCode?('Phòng '+m.currentRoomCode+(m.ready?' • Sẵn sàng':'')):'Chưa vào phòng';
    const flags=card.querySelector('.member-flags');
    if(m.resetRequestedAt)flags.innerHTML+='<span class="member-flag reset">YÊU CẦU ĐẶT LẠI</span>';
    if(m.source)flags.innerHTML+='<span class="member-flag">'+memberEsc(m.source)+'</span>';
    const bindAction=(btn,handler)=>{if(!btn)return;btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(memberAdminState.busy)return;handler()}};
    bindAction(card.querySelector('[data-act="reset"]'),()=>resetMemberPassword(m));
    bindAction(card.querySelector('[data-act="delete"]'),()=>deleteMember(m));
    // Edit only by double-tap / double-click on the member card body.
    card.ondblclick=e=>{if(e.target.closest('.member-card-actions'))return;if(e.detail>=2&&matchMedia('(pointer:fine)').matches){e.preventDefault();openMemberSheet('edit',m)}};
    let lastTap=0;
    card.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'||e.target.closest('.member-card-actions'))return;const now=Date.now();if(now-lastTap<450){e.preventDefault();lastTap=0;openMemberSheet('edit',m)}else lastTap=now},{passive:false});
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
    const img=row.querySelector('.rank-avatar');img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.rank-main b').textContent=m.displayName||m.loginId;
    row.querySelector('.rank-main small').textContent=s.l+' Thua'+(m.online?' • Online':'');
    box.appendChild(row);
  });
}
function allHistoryRows(){
  const out=[];
  for(const m of memberAdminState.members){
    for(const h of (Array.isArray(m.history)?m.history:[]))out.push({...h,loginId:m.loginId,displayName:m.displayName||m.loginId,avatarId:m.avatarId,gameCharacterId:m.gameCharacterId});
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
    const img=row.querySelector('.history-avatar');img.src=memberAvatarUrl(h.gameCharacterId||h.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.history-title b').textContent=h.displayName||h.loginId;
    row.querySelector('.history-sub').textContent=[h.roomName||h.gameName||'Ván GMWW',h.roleName||'',h.faction||''].filter(Boolean).join(' • ');
    row.querySelector('.history-detail').textContent=[h.winnerFaction?('Thắng: '+h.winnerFaction):'',h.roomCode?('Phòng '+h.roomCode):''].filter(Boolean).join(' • ');
    row.querySelector('time').textContent=memberDate(h.playedAt,true);
    box.appendChild(row);
  }
}
function switchMemberTab(tab){
  // Trang Thành Viên luôn hiện đủ các nhóm; không còn chia tab ẩn nội dung.
  memberAdminState.tab=tab;
  if(tab==='history')renderMemberHistory();
  if(tab==='ranking')renderMemberRanking();
  const target=document.getElementById(tab==='ranking'?'memberGroupRanking':'memberGroupDirectory');
  if(target&&tab!=='directory')target.scrollIntoView({behavior:'smooth',block:'start'});
}
function openMemberSheet(mode,m=null){
  memberAdminState.sheetMode=mode;memberAdminState.sheetMember=m;
  if(!memberAdminState.avatars.length)memberAdminState.avatars=memberCharacterCatalog();
  memberAdminState.selectedAvatarId=memberSelectedCharacterId(m);
  const sheet=document.getElementById('memberSheet'),title=document.getElementById('memberSheetTitle'),body=document.getElementById('memberSheetBody'),save=document.getElementById('memberSheetSave');
  if(!sheet||!body)return;
  {
    const editing=mode==='edit';
    title.textContent=editing?'Sửa Thành Viên':'Thêm Thành Viên';
    body.innerHTML='<div class="member-form">'+
      '<label>Tên đăng nhập<input id="memberLoginId" '+(editing?'disabled':'')+' value="'+memberEsc(m?.loginId||'')+'" maxlength="20" placeholder="Vui lòng nhập tên đăng nhập" autocomplete="username"></label>'+
      '<label>Tên Hiển Thị<input id="memberDisplayName" value="'+memberEsc(m?.displayName||'')+'" maxlength="24" placeholder="Bạn mong muốn người chơi khác thấy tên gì?" autocomplete="name"></label>'+
      (editing?'':'<div class="member-password-optional"><button class="member-password-toggle" id="memberPasswordToggle" type="button" aria-expanded="false">＋ Đặt mật khẩu cho tài khoản nếu muốn</button><label class="hidden" id="memberPasswordWrap">Mật khẩu<input id="memberPassword" type="password" minlength="4" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự"></label></div>')+
      '<div class="member-avatar-picker"><div class="member-form-label">Nhân Vật</div><div class="member-avatar-library-head"><b>🎭 Bộ 42 Nhân Vật</b><span id="memberAvatarLibraryCount"></span><button type="button" id="memberAvatarRefresh">↻ Đồng bộ Nhân vật</button></div><div class="member-avatar-grid" id="memberAvatarGrid"></div></div></div>';
    renderMemberAvatarPicker();
    if(!editing){const toggle=document.getElementById('memberPasswordToggle'),wrap=document.getElementById('memberPasswordWrap');if(toggle&&wrap)toggle.onclick=()=>{const open=wrap.classList.contains('hidden');wrap.classList.toggle('hidden',!open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'− Không đặt mật khẩu':'＋ Đặt mật khẩu cho tài khoản nếu muốn';if(open)setTimeout(()=>document.getElementById('memberPassword')?.focus(),30)}}
    document.getElementById('memberDisplayName')?.addEventListener('blur',e=>{e.target.value=memberTitleCase(e.target.value)});
    document.getElementById('memberAvatarRefresh').onclick=async()=>{
      const btn=document.getElementById('memberAvatarRefresh');btn.disabled=true;btn.textContent='Đang đồng bộ…';
      try{await refreshAvatarLibrary();renderMemberAvatarPicker()}catch(e){alert('Không cập nhật được Bộ Nhân Vật: '+e.message)}
      finally{btn.disabled=false;btn.textContent='↻ Đồng bộ Nhân vật'}
    };
    save.textContent=editing?'LƯU THAY ĐỔI':'TẠO THÀNH VIÊN';
  }
  sheet.classList.remove('hidden');
  refreshAvatarLibrary().then(()=>{memberAdminState.selectedAvatarId=memberSelectedCharacterId(m);renderMemberAvatarPicker()}).catch(err=>console.warn('Bộ Nhân Vật:',err.message));
}
async function refreshAvatarLibrary(){
  const response=await fetch(GMWW_SERVER_BASE+'/api/game-characters?gm='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('Không tải được Bộ Nhân Vật từ server');
  const data=await response.json();
  memberAdminState.avatars=memberCharacterCatalog(data?.characters);
  const count=document.getElementById('memberAvatarLibraryCount');if(count)count.textContent=MEMBER_CHARACTER_COUNT+' nhân vật';
}
function renderMemberAvatarPicker(){
  const box=document.getElementById('memberAvatarGrid');if(!box)return;box.innerHTML='';
  ensureMemberCharacterPreviewStyle();
  const count=document.getElementById('memberAvatarLibraryCount');if(count)count.textContent=MEMBER_CHARACTER_COUNT+' nhân vật';
  for(const a of memberAdminState.avatars){
    const b=document.createElement('button');b.type='button';b.className='member-avatar-choice';b.classList.toggle('selected',String(a.id)===String(memberAdminState.selectedAvatarId));
    b.innerHTML='<img alt=""><small></small>';
    const img=b.querySelector('img'),num=Number(String(a.id).slice(-2));
    img.alt=a.name||a.id;img.src=memberCharacterFrameUrl(a.id,1);
    if(num<=MEMBER_ANIMATED_CHARACTER_COUNT)img.dataset.memberCharacter=a.id;else img.classList.add('member-character-static');
    img.onerror=()=>{img.onerror=null;img.src=memberAvatarUrl(a.id)};
    b.querySelector('small').textContent=a.name||a.id;
    b.onclick=()=>{memberAdminState.selectedAvatarId=a.id;renderMemberAvatarPicker()};box.appendChild(b);
  }
  if(!memberAdminState.avatars.length)box.innerHTML='<div class="member-empty">Không tải được Bộ Nhân Vật.</div>';
  ensureMemberCharacterPreviewTicker();
}
function closeMemberSheet(){
  const s=document.getElementById('memberSheet');if(s)s.classList.add('hidden');
  if(memberAdminState.characterPreviewTimer){clearInterval(memberAdminState.characterPreviewTimer);memberAdminState.characterPreviewTimer=null}
  memberAdminState.sheetMode='';memberAdminState.sheetMember=null;
}
async function saveMemberSheet(){
  const btn=document.getElementById('memberSheetSave');if(btn?.disabled)return;
  const mode=memberAdminState.sheetMode,m=memberAdminState.sheetMember;
  try{
    if(btn){btn.disabled=true;btn.classList.add('is-busy')}
    {
      const loginId=document.getElementById('memberLoginId')?.value.trim()||m?.loginId||'',displayName=memberTitleCase(document.getElementById('memberDisplayName')?.value||''),gameCharacterId=memberAdminState.selectedAvatarId,avatarId=gameCharacterId;
      if(displayName.length<2)throw new Error('Tên Hiển Thị phải có ít nhất 2 ký tự.');
      if(!gameCharacterId)throw new Error('Vui lòng chọn Nhân Vật.');
      if(mode==='edit'){
        await gmApi('/api/gm/members/edit',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId,gameCharacterId})});
      }else{
        const password=document.getElementById('memberPassword')?.value||'';if(password&&password.length<4)throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
        await gmApi('/api/gm/members/create',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId,gameCharacterId,password})});
      }
    }
    closeMemberSheet();memberAdminState.loaded=false;await loadMembers(true);
  }catch(err){alert(err.message||'Không thể lưu Thành Viên.')}
  finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function resetMemberPassword(m){
  if(!m)return;
  const yes=window.confirm('Bạn có muốn reset mật khẩu của "'+(m.displayName||m.loginId)+'" về 0000 không?\n\nNhấn OK để xác nhận.');
  if(!yes)return;
  let ok=false;
  try{setMemberBusy(true);await gmApi('/api/gm/members/reset-password',{method:'POST',body:JSON.stringify({loginId:m.loginId})});memberAdminState.loaded=false;ok=true}
  catch(err){alert(err.message||'Không thể reset mật khẩu.')}
  finally{setMemberBusy(false)}
  if(ok){alert('Đã reset mật khẩu về 0000.');await loadMembers(true)}
}
async function resetRanking(){
  if(!confirm('Xếp hạng lại từ đầu?\nThao tác này sẽ đưa Thắng/Thua về 0 và xoá toàn bộ lịch sử cũ của tất cả Thành Viên.'))return;
  try{setMemberBusy(true);await gmApi('/api/gm/members/reset-ranking',{method:'POST'});memberAdminState.loaded=false;setMemberBusy(false);await loadMembers(true);switchMemberTab('ranking')}
  catch(err){alert(err.message||'Không thể xếp hạng lại.')}finally{setMemberBusy(false)}
}
async function clearMemberHistory(){
  if(!confirm('Xoá toàn bộ Lịch Sử?\nThống kê Thắng/Thua hiện tại sẽ được giữ nguyên.'))return;
  try{setMemberBusy(true);await gmApi('/api/gm/members/history',{method:'DELETE'});memberAdminState.loaded=false;setMemberBusy(false);await loadMembers(true);switchMemberTab('history')}
  catch(err){alert(err.message||'Không thể xoá lịch sử.')}finally{setMemberBusy(false)}
}
async function deleteMember(m){
  if(!m)return;
  const yes=window.confirm('Bạn có muốn xoá Thành Viên "'+(m.displayName||m.loginId)+'" không?\n\nNhấn OK để xác nhận.');
  if(!yes)return;
  let ok=false;
  try{setMemberBusy(true);await gmApi('/api/gm/members/'+encodeURIComponent(m.loginId),{method:'DELETE'});memberAdminState.loaded=false;ok=true}
  catch(err){alert(err.message||'Không thể xoá Thành Viên.')}
  finally{setMemberBusy(false)}
  if(ok){alert('Đã xoá Thành Viên.');await loadMembers(true)}
}
const memberTabsEl=document.getElementById('memberTabs');if(memberTabsEl)memberTabsEl.addEventListener('click',e=>{const b=e.target.closest('[data-member-tab]');if(b)switchMemberTab(b.dataset.memberTab)});
const memberSearchEl=document.getElementById('memberSearch');if(memberSearchEl)memberSearchEl.addEventListener('input',()=>{memberAdminState.query=memberSearchEl.value;renderMemberDirectory()});
const memberFilterRow=document.getElementById('memberFilterRow');if(memberFilterRow)memberFilterRow.addEventListener('click',e=>{const b=e.target.closest('[data-member-filter]');if(!b)return;memberAdminState.filter=b.dataset.memberFilter;memberFilterRow.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberDirectory()});
const historyResultFilter=document.getElementById('historyResultFilter');if(historyResultFilter)historyResultFilter.addEventListener('click',e=>{const b=e.target.closest('[data-history-result]');if(!b)return;memberAdminState.historyResult=b.dataset.historyResult;historyResultFilter.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberHistory()});
const historyMemberFilter=document.getElementById('historyMemberFilter');if(historyMemberFilter)historyMemberFilter.addEventListener('change',()=>{memberAdminState.historyLogin=historyMemberFilter.value;renderMemberHistory()});
const refreshMembers=document.getElementById('refreshMembers');if(refreshMembers)refreshMembers.addEventListener('click',()=>{memberAdminState.loaded=false;loadMembers(true)});
const addMember=document.getElementById('addMember');if(addMember)addMember.addEventListener('click',()=>openMemberSheet('create'));
const resetRankingBtn=document.getElementById('resetRanking');if(resetRankingBtn)resetRankingBtn.addEventListener('click',resetRanking);
const clearHistoryBtn=document.getElementById('clearHistory');if(clearHistoryBtn)clearHistoryBtn.addEventListener('click',clearMemberHistory);
const memberSheetClose=document.getElementById('memberSheetClose');if(memberSheetClose)memberSheetClose.addEventListener('click',closeMemberSheet);
const memberSheetCancel=document.getElementById('memberSheetCancel');if(memberSheetCancel)memberSheetCancel.addEventListener('click',closeMemberSheet);
const memberSheetSave=document.getElementById('memberSheetSave');if(memberSheetSave)memberSheetSave.addEventListener('click',saveMemberSheet);
const memberSheet=document.getElementById('memberSheet');if(memberSheet)memberSheet.addEventListener('click',e=>{if(e.target===memberSheet)closeMemberSheet()});
document.querySelectorAll('[data-page="members"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>loadMembers(false),40)));

/* V3.36 — Trang Chủ: cảm hứng bố cục V1, tất cả số liệu dựa trên máy chủ thật. */
let gmwwHomeBusy=false,gmwwHomeLastLoaded=0,gmwwHomeAllRecent=false,gmwwHomeCachedRows=[];
function gmwwHomeText(id,text){
  const node=document.getElementById(id);
  if(node)node.textContent=String(text??'—');
}

function gmwwHomeRenderExtras(rows,ranking,leader){
  const totalLeader=document.getElementById('gmwwHomeLeaderWins');
  if(totalLeader)totalLeader.textContent=leader?String(memberStats(leader).w):'—';
  const label=document.getElementById('gmwwHomeLeaderboard');
  if(label)label.textContent=leader?String(leader.displayName||leader.loginId||'Thành viên'):'Chưa xếp hạng';
  const target=document.getElementById('gmwwHomeRecentRows');
  const status=document.getElementById('gmwwHomeRecentResult');
  if(!target)return;
  target.replaceChildren();
  gmwwHomeCachedRows=rows;
  const recent=rows.flatMap(m=>(Array.isArray(m.history)?m.history:[]).map(h=>({...h,member:m})))
    .filter(h=>Number.isFinite(Date.parse(h.playedAt||'')))
    .sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt)).slice(0,gmwwHomeAllRecent?50:3);
  const more=document.getElementById('gmwwHomeOpenRanking');if(more)more.textContent=gmwwHomeAllRecent?'Thu gọn ❮':'Xem tất cả ❯';
  if(status)status.hidden=recent.length>0;
  const ago=t=>{
    const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(t))/60000));
    if(minutes<60)return minutes+' phút trước';
    const hours=Math.floor(minutes/60);
    if(hours<24)return hours+' giờ trước';
    return Math.floor(hours/24)+' ngày trước';
  };
  for(const h of recent){
    const button=document.createElement('button');
    button.type='button';button.className='gmww-home-recent-row';
    button.setAttribute('aria-label','Mở Thành Viên: '+String(h.member.displayName||h.member.loginId||''));
    const avatar=document.createElement('div');avatar.className='gmww-home-recent-avatar';
    const avatarId=String(h.member.gameCharacterId||h.member.avatarId||'');
    if(/^(?:character-(?:0[1-9]|[1-3][0-9]|4[0-2])|avatar-[A-Za-z0-9_-]+)$/.test(avatarId)){
      const image=document.createElement('img');image.src=memberAvatarUrl(avatarId);image.alt='';image.loading='lazy';
      image.onerror=()=>{image.remove();avatar.textContent='♟'};
      avatar.append(image);
    }else avatar.textContent='♟';
    const name=document.createElement('b');name.textContent=String(h.member.displayName||h.member.loginId||'Thành viên');
    const action=document.createElement('span');action.textContent=h.result==='win'?'Đã thắng một ván':h.result==='loss'?'Đã kết thúc ván':'Tham gia ván chơi';
    const time=document.createElement('small');time.textContent=ago(h.playedAt);
    const arrow=document.createElement('i');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
    button.append(avatar,name,action,time,arrow);
    button.addEventListener('click',()=>gmwwHomeNavigate('members'));
    target.append(button);
  }
}

function gmwwHomeRenderMembers(rows){
  if(!Array.isArray(rows))return;
  gmwwHomeText('gmwwHomeMemberCount',rows.length);
  gmwwHomeText('gmwwHomeOnlineCount',rows.filter(m=>m?.online).length);
  const played=rows.reduce((sum,m)=>sum+memberStats(m).games,0);
  const matches=new Set(rows.flatMap(m=>Array.isArray(m.history)?m.history:[]).map(h=>String(h.matchId||'')).filter(Boolean));
  gmwwHomeText('gmwwHomePlaysCount',matches.size||played);
  const ranking=[...rows].sort((a,b)=>{
    const A=memberStats(a),B=memberStats(b);
    return B.w-A.w||B.rate-A.rate||B.games-A.games||String(a.displayName||a.loginId||'').localeCompare(String(b.displayName||b.loginId||''),'vi');
  });
  const leader=ranking.find(m=>memberStats(m).games>0);
  gmwwHomeText('gmwwHomeLeaderboard',leader
    ?'Dẫn đầu: '+String(leader.displayName||leader.loginId||'Thành viên')+' · '+memberStats(leader).w+' thắng'
    :'Chưa có kết quả để xếp hạng.');
  const last=rows.flatMap(m=>(Array.isArray(m.history)?m.history:[]).map(h=>({...h,memberName:m.displayName||m.loginId})))
    .filter(h=>Number.isFinite(Date.parse(h.playedAt||'')))
    .sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt))[0];
  gmwwHomeText('gmwwHomeRecentResult',last
    ?String(last.memberName||'Thành viên')+' · '+(last.result==='win'?'Thắng':last.result==='loss'?'Thua':'Đã tham gia')+' · '+memberDate(last.playedAt,true)
    :'Chưa có lịch sử ván được ghi nhận.');  gmwwHomeRenderExtras(rows,ranking,leader);
}

async function gmwwHomeRefresh(force=false){
  const home=document.getElementById('home');
  if(!home||gmwwHomeBusy||(!force&&gmwwHomeLastLoaded&&Date.now()-gmwwHomeLastLoaded<60000))return;
  gmwwHomeBusy=true;
  const badge=document.getElementById('gmwwHomeServerState');
  if(badge){badge.dataset.status='checking';const label=badge.querySelector('span');if(label)label.textContent='Đang kết nối'}
  gmwwHomeText('gmwwHomeVersion','GMWW V'+VERSION);
  try{
    const [health,members]=await Promise.allSettled([
      fetch(GMWW_SERVER_BASE+'/api/health?home='+Date.now(),{cache:'no-store'})
        .then(async r=>{const data=await r.json();if(!r.ok||data.ok!==true)throw new Error('Server không phản hồi');return data}),
      gmApi('/api/gm/members')
    ]);
    if(badge){const ok=health.status==='fulfilled';badge.dataset.status=ok?'online':'offline';
      const label=badge.querySelector('span');if(label)label.textContent=ok?'Server kết nối':'Mất kết nối'}
    if(members.status==='fulfilled'&&Array.isArray(members.value?.members))
      gmwwHomeRenderMembers(members.value.members);
    else{
      gmwwHomeText('gmwwHomeMemberCount','—');
      gmwwHomeText('gmwwHomeOnlineCount','—');
      gmwwHomeText('gmwwHomePlaysCount','—');
      gmwwHomeText('gmwwHomeLeaderboard','Chưa kết nối được dữ liệu thành viên.');
      gmwwHomeText('gmwwHomeLeaderWins','—');
      document.getElementById('gmwwHomeRecentRows')?.replaceChildren();
      const msg=document.getElementById('gmwwHomeRecentResult');if(msg)msg.hidden=false;
      gmwwHomeText('gmwwHomeRecentResult','Không tải được lịch sử. Nhấn Làm mới để thử lại.');
    }
    gmwwHomeLastLoaded=Date.now();
  }finally{gmwwHomeBusy=false}
}
function gmwwHomeNavigate(target){
  if(!['start','members','library','settings'].includes(target))return;
  const nav=document.querySelector('#bottomNav .nav[data-page="'+target+'"]');
  if(nav)nav.click();
}
document.getElementById('gmwwHomeEnterVillage')?.addEventListener('click',()=>gmwwHomeNavigate('start'));
document.querySelectorAll('[data-home-destination]').forEach(button=>button.addEventListener('click',()=>{gmwwHomeNavigate(button.dataset.homeDestination);const tab=button.dataset.homeLibraryTab;if(tab&&button.dataset.homeDestination==='library')document.querySelector('#library .libtab[data-lib="'+tab+'"]')?.click()}));
document.getElementById('gmwwHomeOpenRanking')?.addEventListener('click',()=>{
  gmwwHomeAllRecent=!gmwwHomeAllRecent;
  if(gmwwHomeCachedRows.length)gmwwHomeRenderMembers(gmwwHomeCachedRows);
});
document.getElementById('gmwwHomeRefresh')?.addEventListener('click',()=>gmwwHomeRefresh(true));
document.querySelectorAll('#bottomNav .nav[data-page="home"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>gmwwHomeRefresh(false),35)));
setTimeout(()=>{if(document.getElementById('home')?.classList.contains('active'))gmwwHomeRefresh()},150);



/* GMWW V2.57 — immersive 2D village GM flow */
const GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE';
const GMWW_OLD_PLAY_SCENE_KEYS=['GMWW_V263_PLAY_SCENE','GMWW_V257_PLAY_SCENE','GMWW_V256_PLAY_SCENE','GMWW_V255_PLAY_SCENE','GMWW_V250_PLAY_SCENE','GMWW_V247_PLAY_SCENE','GMWW_V246_PLAY_SCENE'];
const PLAY_STEPS=['lobby','room','seats','game','roles','deal','battle'];
let playGatherToolsDismissed=false;
const PLAY_STEP_COPY={
  lobby:{k:'SẢNH CHỜ',t:'Tạo Phòng',x:'Mọi người tập trung tại làng. Nhấn Tiếp tục để vào bước Tạo phòng.',a:'TẠO PHÒNG'},
  room:{k:'TẠO PHÒNG',t:'Tạo Phòng',x:'Chọn ONLINE hoặc OFFLINE rồi tạo Phòng.',a:'TẠO PHÒNG'},
  game:{k:'CHỌN VÁN MẪU',t:'Chọn Ván Mẫu',x:'Server chuẩn bị sẵn cấu hình Ván Mẫu; Player Web chưa nhận Vai Trò.',a:'CHỌN VÁN MẪU'},
  seats:{k:'TẬP HỢP DÂN LÀNG',t:'Tập Hợp Dân Làng',x:'Gọi thành viên vào làng, sắp ngẫu nhiên ưu tiên 8 vị trí vòng trong hoặc GM bố trí thủ công.',a:'CHỐT VỊ TRÍ'},
  roles:{k:'PHÂN VAI',t:'Phân Vai',x:'Vai Trò và Artifact được phân nội bộ, chưa gửi xuống Player Web.',a:'PHÂN VAI'},
  deal:{k:'PHÁT VAI',t:'Phát Vai',x:'Chỉ tại bước này Server mới gửi Vai Trò/Artifact riêng xuống Player Web.',a:'PHÁT VAI'},
  battle:{k:'VÀO TRẬN',t:'Vào Trận',x:'Tiếp tục điều khiển toàn bộ trận ngay trong Làng 2D.',a:'BẮT ĐẦU ĐÊM 1'}
};
let playSceneState=(()=>{
  const base={step:'lobby',lobbyGeneration:0,roomMode:'online',roomEnabled:false,seatMoveMode:'instant',seatCount:24,autoGM:true,phase:'lobby',night:0,artifactCount:0,roomCode:'—',gmToken:'',selectedMemberIds:[],activePlayerId:'',roleId:'',artifactId:'',rolePlan:{},roleDurations:{},assignmentsPreview:[],gameName:'Ván GMWW',gameTemplateId:'',gameTiming:{villageDiscussionSec:300,wolfDiscussionSec:60,defaultActionSec:30,artifactActionSec:30,autoAdvance:true},artifactLimitPerCycle:3,matchId:'',artifactsEnabled:false};
  try{let raw=localStorage.getItem(GMWW_PLAY_SCENE_KEY),migratedFrom='';if(!raw)for(const key of GMWW_OLD_PLAY_SCENE_KEYS){raw=localStorage.getItem(key);if(raw){migratedFrom=key;break}}const saved=Object.assign(base,JSON.parse(raw||'{}'));saved.roomMode=saved.roomMode==='online'?'online':'offline';saved.roomEnabled=saved.roomEnabled===true;saved.seatMoveMode=saved.seatMoveMode==='walk'?'walk':'instant';saved.seatCount=Math.max(1,Math.min(30,Number(saved.seatCount)||12));if(saved.step==='members')saved.step='seats';saved.lobbyGeneration=Math.max(0,Number(saved.lobbyGeneration||0));if(migratedFrom){saved.roomCode='—';saved.gmToken='';saved.roomEnabled=false;saved.selectedMemberIds=[];saved.assignmentsPreview=[];saved.activePlayerId='';saved.roleId='';saved.artifactId='';saved.matchId='';saved.gameTemplateId='';saved.rolePlan={};saved.roleDurations={};saved.step='lobby';saved.phase='lobby';saved.night=0;saved.artifactCount=0}if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(saved.roomCode||''))&&!['lobby','room'].includes(saved.step))saved.step='lobby';if(['lobby','room'].includes(saved.step)&&!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(saved.roomCode||''))){saved.roomCode='—';saved.gmToken='';saved.selectedMemberIds=[];saved.activePlayerId=''}return saved}catch{return base}
})();
const playSceneRuntime={room:null,players:[],assignments:[],gameConfig:null,gameTemplates:[],artifactCycle:{count:0,max:3},nightRuntime:null,winProposal:null,activeEffects:[],selectedWinnerFaction:'',busy:false,pollTimer:0,villagePollTimer:0,moveTicker:0,autoTurnTimer:0,autoTurnKey:'',roomSyncTimer:0,syncSerial:0,lastSyncAt:0,lastError:'',serverClockOffsetMs:0,socket:null,socketRoomCode:'',socketReconnect:0,setupPopupStep:'',setupPopupClosed:false};
function savePlayScene(){try{localStorage.setItem(GMWW_PLAY_SCENE_KEY,JSON.stringify(playSceneState))}catch{}}
function isLivePlayRoom(){return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(playSceneState.roomCode||''))}
function playLiveMembers(){
  if(Array.isArray(playSceneRuntime.players)&&playSceneRuntime.players.length)return playSceneRuntime.players.filter(p=>p?.kind==='member');
  const rows=Array.isArray(memberAdminState?.members)?memberAdminState.members:[],wanted=new Set((playSceneState.selectedMemberIds||[]).map(String));
  if(wanted.size)return rows.filter(m=>wanted.has(String(m.loginId)));
  return [];
}
function playVillageMembers(){
  const live=playLiveMembers(),onlineSelection=!isLivePlayRoom()&&playSceneState.roomMode==='online',byId=new Map(onlineSelection?[]:live.map(m=>[String(m.loginId),m]));
  if(onlineSelection){
    const liveById=new Map(live.map(m=>[String(m.loginId),m]));
    for(const m of (memberAdminState.members||[]).filter(x=>x?.online&&x?.loginId&&!x.currentRoomCode)){
      const id=String(m.loginId),old=liveById.get(id)||{};
      byId.set(id,{...m,...old,kind:'member',loginId:id,online:true});
    }
    for(const m of live){
      const id=String(m?.loginId||String(m?.participantId||'').replace(/^member:/,''));
      if(id&&!byId.has(id))byId.set(id,{...m,kind:'member',loginId:id,online:true});
    }
  }
  return [...byId.values()];
}
function playRoamPoint(id){const p=globalThis.GMWW_VILLAGE_LAYOUT.spawn('member:'+id);return[p.x,p.y]}
function playMapDisplay(x,y){const world=document.getElementById('playWorld'),p=globalThis.GMWW_VILLAGE_LAYOUT.toScreen({x,y},world?.clientWidth||864,world?.clientHeight||1536);return[p.x,p.y]}
function playPlayerEffect(loginId){
  const rows=(playSceneRuntime.activeEffects||[]).filter(x=>String(x?.loginId||'')===String(loginId||'')&&x?.effectActive!==false),types=new Set(rows.map(x=>String(x?.type||'')));
  if(types.has('dead'))return'dead';if(types.has('frozen'))return'frozen';if(types.has('expelled'))return'expelled';return'alive'
}
function playDeliveryLabel(member){
  const a=(playSceneRuntime.assignments||[]).find(x=>String(x?.loginId||'')===String(member?.loginId||''));if(!member?.online)return'MẤT KẾT NỐI';if(!a)return playSceneState.step==='deal'||playSceneState.step==='battle'?'CHƯA PHÁT':(member?.ready?'SẴN SÀNG':'ONLINE');
  if(a.viewedAt&&(!a.artifactId||a.artifactViewedAt))return'ĐÃ XEM';if(a.viewedAt&&a.artifactId)return'ĐÃ XEM VAI';return'ĐÃ PHÁT'
}
async function applyPlayPlayerState(type){
  const loginId=String(playSceneState.activePlayerId||'');if(!loginId){playFlashError('Hãy chọn Người Chơi trên sân trước.');return false}
  const member=playLiveMembers().find(x=>String(x?.loginId||'')===loginId),label=member?.displayName||loginId;
  const question=type==='dead'?'Giết '+label+' ngay lập tức?':type==='revive'?'Hồi Sinh '+label+' ngay lập tức?':type==='expelled'?'Đuổi '+label+' khỏi làng?':'';
  if(question&&!confirm(question))return false;
  playSetBusy(true);try{
    await playRoomApi('/interaction',{method:'POST',body:JSON.stringify({loginId,type,matchId:playSceneRuntime.room?.matchId||playSceneState.matchId||'',night:Number(playSceneState.night||0),cycleKey:playSceneRuntime.room?.cycleKey||''})});await playSyncRoom(true);return true
  }catch(err){playFlashError(err.message);return false}finally{playSetBusy(false)}
}
function bindPlayPlayerStateActions(){
  document.querySelectorAll('[data-play-player-state]').forEach(b=>b.onclick=()=>applyPlayPlayerState(String(b.dataset.playPlayerState||'')))
}
function closePlayGMSheet(){document.getElementById('playGMSheet')?.classList.add('hidden')}
function openPlayGMSheet(){
  const sheet=document.getElementById('playGMSheet');if(!sheet)return;
  const loginId=String(playSceneState.activePlayerId||''),member=playLiveMembers().find(x=>String(x?.loginId||'')===loginId),stateLabel=loginId?playPlayerEffect(loginId):'alive';
  const target=document.getElementById('playGMTarget'),kill=document.getElementById('playGMKill'),revive=document.getElementById('playGMRevive');
  if(target)target.textContent=member?(member.displayName+' • '+(stateLabel==='dead'?'Đã chết':stateLabel==='frozen'?'Đóng băng':stateLabel==='expelled'?'Bị đuổi':'Đang sống')):'Hãy chọn một Người Chơi trên sân.';
  if(kill)kill.disabled=!member||stateLabel==='dead';if(revive)revive.disabled=!member||stateLabel!=='dead';
  sheet.classList.remove('hidden')
}
function setPlayRealtimeState(state='idle'){
  const btn=document.getElementById('playRefreshServer');if(!btn)return;
  btn.classList.toggle('is-live',state==='live');btn.classList.toggle('is-reconnecting',state==='connecting');btn.classList.toggle('is-offline',state==='offline');
  btn.dataset.realtimeState=state;
  const label=state==='live'?'Realtime đang kết nối':state==='connecting'?'Đang kết nối realtime':'Realtime mất kết nối';
  btn.setAttribute('aria-label',label);btn.title=label;
}
function playAudioMuted(){try{return localStorage.getItem(PLAY_AUDIO_MUTED_KEY)==='1'}catch{return false}}
function applyPlayAudioState(){
  const muted=playAudioMuted(),btn=document.getElementById('playAudioTop'),glyph=btn?.querySelector('.gm-top-icon-audio-v293');
  document.querySelectorAll('audio').forEach(a=>{a.muted=muted});
  if(btn){btn.classList.toggle('is-muted',muted);btn.setAttribute('aria-pressed',String(!muted));btn.setAttribute('aria-label',muted?'Âm thanh đang tắt':'Âm thanh đang bật');btn.title=muted?'Audio: Tắt':'Audio: Bật'}
  if(glyph)glyph.textContent=muted?'🔇':'🔊';
}
function togglePlayAudio(){
  const muted=!playAudioMuted();try{localStorage.setItem(PLAY_AUDIO_MUTED_KEY,muted?'1':'0')}catch{}
  applyPlayAudioState();
}
async function refreshPlayServerRealtime(){
  const btn=document.getElementById('playRefreshServer');if(!btn||btn.dataset.syncing==='1')return;
  btn.dataset.syncing='1';btn.classList.remove('is-ok','is-error');btn.classList.add('is-syncing');setPlayRealtimeState('connecting');
  try{
    if(isLivePlayRoom()){
      disconnectPlaySocket();
      await playSyncRoom(true);
      connectPlaySocket();ensurePlayRealtimePoll();renderPlayPlayers();syncPlayMovementTicker();
    }else{try{await loadMembers(false)}catch{}await playSyncGlobalVillageMotion(true);renderPlayScene()}
    btn.classList.add('is-ok');setTimeout(()=>btn.classList.remove('is-ok'),850)
  }catch(err){setPlayRealtimeState('offline');btn.classList.add('is-error');playFlashError('Không cập nhật được realtime từ server. '+(err?.message||''));setTimeout(()=>btn.classList.remove('is-error'),1100)}
  finally{delete btn.dataset.syncing;btn.classList.remove('is-syncing')}
}
function playSeatPositions(count){return globalThis.GMWW_VILLAGE_LAYOUT.positions(count).map(p=>[p.x,p.y])}
function playEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function playActiveCharacterId(gameCharacterId){const id=String(gameCharacterId||'');return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(id)?id:'character-01'}
function playWalkDirection(member){const dx=Number(member?.moveToX)-Number(member?.moveFromX);return Number.isFinite(dx)&&dx<-.01?'left':'right'}
function playCharacterFrameUrl(gameCharacterId,frame=1,direction='right'){const id=playActiveCharacterId(gameCharacterId),n=Number(id.slice(-2)),f=Math.max(1,Math.min(6,Number(frame)||1));if(n>20)return GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(id)+'/image';const folder=direction==='left'?'walk-v266-left':'walk-v263';return 'game-characters/'+folder+'/'+id+'/frame-'+String(f).padStart(2,'0')+'.webp'}
function playCharacterUrl(gameCharacterId){return playCharacterFrameUrl(gameCharacterId,1,'right')}
const PLAY_SEATED_CHARACTER01_URL="data:image/webp;base64,"+["UklGRoQeAABXRUJQVlA4WAoAAAAQAAAAiwAArgAAQUxQSCoMAAABDARt2ybhD/t7t+kHEBETwF89M+sd7wELxAXNAcsJE98wXSAgFOiAhN5o2zY2Sdu2udY+Aqmybdu2bdu2bdtMFBNlZZZt265KFRORcW7OH+cZZ0Qdx47r59UiYgLs2LatWlv1RWQ0IlJqQOwSWgg1oJFTDacIpITuksF7L3V3d7dz9hxzB3vttdc+3ytAREwA/n9z+Z8CpjcTVZFm+hYwvVhDU2gjGXD5WjC9liy8/AIzGAAoBECBA9NBML2UyMZvcMxbQw5dAoARQGcYz5NgegltRrQwKhhwKUl2Pnf0zMCs7dAXE/eC9g5QaaQFut45uM5E/nJy29TnzYcH6ScsJpo/wSzrAlIURaFAn3VPufPBpx4ZePqyh030wVvyzfm2+nH6eziFD0GlF2j/+OYF0XChCz6PbBzf+D2FGIPlr/N9PHAYXawtjml2k8zB4Fz+/ewVRx948j1/k8Fa55y1kYwNLd8byb9TsLxQZnprekjeVOYcl9jY+ti1D41iIANjdHwJW/hloAAkX9Cb5/p5HOdxitomBOrf6fc2l9VCjUHO7rh54WhsV//6pfxtAOpn75srMbi565Fvd23D/7Zp1JyLLbLcNoNvbtWsSFcKLPvy1/4nrugQJ0/qnFLjv4tIXqCNDGa47fk3vtuY2juIkUwx/rEykJX2FqgRgcGKH5x38o+7LhNDCLHzx4FLQyQXgqnvXQUABCuMWu8a9jaxuWQiJ55TQDMBxTPx3i1nbdMFXtt2OJ2YmqlzWop+CvnwVJBMFDiQ5D/f+uJX//1bPyn0QqF77aa3+XJflTwIZhjtLHvv9MYtiFOeX303OwSaBxgczU7fmhC4gA0G","HCM7Npjr151h8iBaPMVOYrtgo22comNtofkH9ZE8QGTGD9miK3tkdPy2fbmFIHmAyjS3uZXZVcAk1ng5+sNIFkQx31Uo48Ge2WXzECYvDAEkA6I48G+KpbTtGs+i5cUo1t9B1VROcTVTjc12STbEP+9+f/wSAqiplsHp/GxKvPVk5/pA353PbZGqKADFOjzyzhhuiT3zfsyQIU9+x8NQVAVqtOj/5PrrMsSr20Ge9e/3E6lI6xIAMOtSU/+SfNlsCoPr4ITloKim6sDhWy697I5XjmOIPWzXURr4wzpQVLTAbqS1JH0sXXG4dnYoKisD3o8+eRtiz3HpkI5FC6qrWDP6k632lWLgljDVgeIY+tAGm3UVeOb4TotUCIp9/9n7DvKarjgRatwCpkJS4L43fo/KVquyZBwKrVD9He+4XUxFniMf4uipIZXR6Vrnff5bvfH/If049dFuOTFVURz++7+9n1xY7HS8HEdvhsqKFJek3rsvYQ9bU/TxtKmnk1lMRepXvufXiZPzEFOM/Pn5L/cTrYwCfVb6NoUG3rLXQQyuk7y9RaQ6gllepo95IPnn0aiwoO3AH+jjf2jvswlD+vzR0+aDSlUEs90wmuzsGftynncDUFRXWlYfNJZkT9hcZh4cH1+mTSpUP8tWhz6YfA+QspfsCpJM52il1AB4ja47Zm7ja8jjfv74zt1mRMULsyudDT2GsSm0l2oc2t6G6iuGp06yOafq7VxiGj0dCiMVE7R8Sg57gC1zzYXkvmBcURRVF/T7iUfhOh5VNkgLBmzSIW2y08S1kYOWX86ADOO5R0gzG7ziuDd2WRxSOaDlkHYt3ueholFhaxLGZmBlf4NcqizcYXvXJcBUem6DIhNicAP5gx+jjF0wUhziv7NDM6HY","c8Knl848ItV6jAE2WA6EIpey9HytwOtkaIIFJAZirViOmUvyAUB0Hf5yr2vKTqUlpJS3/GdDKPIpqu3nXz7zWgxN7JTIkx8sB4O8qgFWCbEkyiT/+Qn9oMhui0wzJvnuSTM7AgkUYow2/rR6H0CRYYObWetebJPUGATyG6AQ5Fhk5u9Zq2Jt5O0f8nAxyLNi6Z8YrfVNaGR14l0a07f/bjsY5Fox5xBPMgbfDLGUApFxFPKuwDKnDnzOk2ELoH71S/ylrxYmYxAFcCI/vzBlFCy2/hNgh/uXRkshGQNMscSI4/vi8X4GoBL5NxcftO7ScxYATM4gQN8NT36Hxt5OMvz53qD954FkTLDl4xNIis2y1ieS/PtkSLYMDiXpreeSwVuXuA9MpkTv/i3/E1e28aVsteLZfrDoXSF2LALNkmKh79JydkY10adP54dmSLHGr10skBTVjq+1S34Us47mwS103Eg0O0Z3ouU2+rQxWnIjBfZOPmVfJaRrp4LmRRRHjA2hyt4SAz9YDJoTUVzOFOKiHWgbZ//N0tCMGJzJmo9d2xmJ/f/rH0+tkg3F6t752AzZnKo4eBVMRkbRhtBEXpIAAxprFDsWgmZCsZyLsUdsQJK2YXkmTCYKnEgbQ4wRKRdGY53k0ksikgfFINrYUGQdKCG1ib3kOXpaZEIwsqukY6DC8UxS4OQF8vFBPzcgMRnBMUkppM7FoHkweL0fK4YEKx7JQeCEOSG5eK6fK+SmEjOWPD9py8dTvWXsgDVEGLD0jgjyqObTflawhmYGOxV92gUmCwbb9EbadlUcscKvBojkQOS5foIkRWDwSBGhnYqO+6DIgGKRDrRCwB6TDy49J5KBAgfwUMhFo8UQQupYBJqDS/m/SNeTBimE6LgriuoZ","3MpDEoFy9jYQgEKMlifloMAlPJAYdYnSBhflYXeeTEVoe59zse7EHCgW6fAstHFMuSsc98sBIK/1lhsDyj14xXNbmAwYDO6HVMG1HXfMxMB+MFXg8GKWZ6LIgOCZ3lICcyUp8BwJqZ5g+tFdkWIAm83GjggDx88EqZzK9ON6CzQn6SobDEhikuwy0GppoQCu9FmXdAEonE2YXYxIdVQBtM+0+F7/tAaYSCs26zaQcrwD9cZINQyw+IkPfzmuM4p5zgku4NPXSy6w0FzTKgAjFTBY5N5OkkwxHTG3c45sQo2EIY3+dUrHhNFv3bLr7IApnWK/vzrH2aSECQdp4gE8MmGagT7/42v3wJTM4GSmQyzawTjBtifYNmCSExsUtvPs/Ve7wJRKsTetZ912QhqYTA1OjR5JH50nw5RIZY5xwcXSAhYAs43muAu0PAZXsxYbasxMJeYpm1Kz7uMfc4iWRTDXn8GHINAOKWDiwSWljlfDlKXAUayFZgFJSqExih05IQVOSYBE9Onn/pCSKIYl2w1NUYZFE1CjMaMYY1wVWhIU79PHZlaDYpsUU01zjrvClEPQ+lm3mDSpNRU4sClRLq47AEU5APMufaxPMGmDtOKIhVD5lOf2MCVRPJhsD40V8ysltwS0JAWOZ6NQkBsLDHgXM6JP77YISqqYbXT0TcQL44oBvKQ0acd9YMoCg4Nou8WaNDGj7et4ftQuUhoxMpS2kWYgqBk92DilEQlJ5B23gEF5Rab7iL4rKRpz0sy2qaq0vB8GZVYsODb5uvoUSGKmBLWi1PLTGVRKBYNNXPRdFK5d2vL3haEoucGugbbHuJDtXHD8YDEoSm+w69/0LvRQvMue2VGw5PDpYVBBg8VGksk6JWzAiXobPBLbBmQjf90d","UFTSAFuMrJEdJ8arsNbpb50TKqioCrDkKaP+EtkwANhbbELbDrCR/3rb8oBBhY0AmPV8+ma4oJnadjC2xwAVVFuLFpxG20WcUhPeeu9CN5wAMnpQC1TfyL10dawFG1mfrG+OZRs4+9MwGRA83qDZRt6R/t0rttl6WAfpfRcu8OSZTDzTyJ40DORPV65SAMBi531FukYsOQT58Uw81mjRxy/2nxZAYYwC/Xb6nO5s7VQBDPJxLzQDBoNpuxVq5OqAUQEALYAZh3L0Kdawrf7LOyEZKHByXYp44h355+5oEXQtBbD7B9/7xuf/6T7PpoSJTr95o8igwZopxJhSahBcIH++eiHoTV4EaGvFao9PIpmsCzF1lVKKjgehyAGk7WPaGFOMKXpH8tW9pwUMlo0AAixw+NCvLUnvfGycUvRx/MyQLBhszVRz9ZH8c8iGAhhFT4pABUCfZU54eAzJaK0P9dbxQCjyaLDfRDZ0rx01G4BC8B9qoQAww3aDvvZs8nQocqlY9PR7Hhx+x/ErCmAM/nPRQgD0W/mI257/cWJt0s9DN4Qin4qujaCkYgzq+8696DwDAEVOtVBRU6igzKKFQUM1KC1WUDggNBIAABBFAJ0BKowArwA+lUCYSKWkIiEuO0p4sBKJaADXGG3TpJUsj+0/rfA1m2tt/671PfpL2Bedl5kP21/Y73dP9t+1Xu8/wXqAf3nqPvQL/arrXv7N5zOagdj/+v8Gfx36F/Qf2/z08e/XRqfdu+LH68eL/yL1AvYvnWfSdpnar0Bfb/7j4Bmpl4P/5PuAcCZ5z+uvwC/nP9hPdr/v//j/pvP79Sf/H/XfAN/Ov7X/1v8B7cvs2/bv2Y/2LRN30ZcQsZPpzS3gIrw8TjEXojOjBj2mmr82l8m9","yXL2nFZ2EOcQSJVYcxTBW+ims3X6WMVbv7C0uAh1L7lukg5cz5tUAeJh53XjwBjbsvIFXFbZXzGfZnBccDnZAVMaFIasj5fufuBMb2nDt8e+I4kC7TLCiBmkz9zbEv02ix4XvXhwj9UaNkdjcyN5qtkMoDinLhblxQlvmGmQIruXJGgtFoddaCMpSZid2AS8Y7CrcPo4MU+3+Gs9qE3yFk+q9TEnecmjEE3YVMl4LWjr9kx8Ox8EN+W3+NEJj6s4weRJcGQbc63Exzmzjq6RL2GcjchSd5yJnTzF6Da0ymZIp4ZgsG/wiymVWoEo40UVYD5v4Dm7ehhd970ljA7/8fS653OmN0PYm8huvJmnPiznFi+BWzZCW15BlCqf8JSwj13oFOVPFrP3MDTf6ZtMa0OMTuV33bL5mbVvhM9w7gGP0aduaCQvlGbs5p3nnBzNs0x/pxj+uGEwgAD+/FzQAeJ54MXZuZxQjKrE5o1VKXeudd+fu864MAT+73r3zaK4Z8UkXBU8Zg5dgjhm9nxnAqU9QVC86N8qMvsTBGh0rqwrdwnTUWg9LK/rVeT3f5GmjyLwJL72lHHbROcUdGXBScAepe/CmQdSo6A/0PsL+FIbPu40U4wSntvQPkAILtLx5WUnAABvM99zIQjuApq4ak78BfPHFMdFm07FhJRB5AcwTE+hmSwy9Og4JrOZFspa5xH5C5D0HjpJ5jg2yTxY54Dh3ihP+FbvF+pq/4WvO39BP75uuuYefLeiivtyGIaAisa93OAgJKEIR2o07UssuRumd8jP4TtWmjeEIbb1jqh+1hnb1DsIK2k32ScrqKIWfbXGBuRQ80G9+R2kHFceX36437Q2LUkzTklNRhEIDV9Y3TYPRpIKrmux2RUE7j6jmquF","z9rHCyqZwMqQX6QP4jijKkYydHmPxXbcWTolGby0BfKg41mFN4fqTn13wLJW6ytos59Jt3Efzsa1hHYoK7Nzx0iFI3oZnjV/ylH/1l6Wgm0xCZMRUvWhz6Sg7CitzAIOKTJjCCR8vSrKPD0+qvqk2SziN7buawYIksQnMFtS87ra/XVsNF3Wwodo9YxmQ1w7OlsNcelUPcJz8vC8MDF4qTclO+H2LE81P4A/GfCelgSZcWshz0BZhAAh+6CRm5Ch1cEkBCN+KJj7K2FVe0ETZrqaJWrOhV16T0v6WJd4W3ASdcp21bJkP16NcqNlLFBcCZj9w9m081Nyw6eboM21BUVblnLXHUcCdwNJqOZCVAsOpgKcekaiJCTreNV1VWPzuGZOhcInlLaNj2rjf1jQ+C92fbHvE93V6nuzFtJ4mUgAIA5lGRCJRDb3FWF2sZfahoVA2teuOgVCwoABC+AtUqMZAciTQOOhkfohXpIW54FScPoNHA8vaA2P740WTuvz2SmgAlbKFKkfpSQIN+FWi9nkUw1XFmo5fIMhf/Yfo+eKMshHpPz5w1iUQQ+V8eAshVcv49JCMzs/2wWPpczSDuchoTEP9BMNp/hpzfzprJoXiT5L5e3UBU2Pp7k0NgETFiH/r6GOfcwjLwbmI4z9MlGUQ70VB03PVivfDksxHNsBkOWTN45wTSPE6jexLAUdq9Ex9freHu2kVd8kAmXK9Fer+roicj6EICmTxkx5bwClD8gZ9vYD9xtsAzMGn0F2rw16nCKZwKDbiIT1ueN3Wixx64eLNDgjGReSnIk1kTI8J951oC49Ny8oAPscUFsCjzhlBqUbQzQYYoqItubr3bPn91o3W6u8qOwl8Ahdqpg/33mccW5yZYvNblh8/VQ+A5Ls","kNzv/OiJ+wYCMrk6dka9OMmu9611vBV1cxKsKZAUxXuulPT5ildvF7A9gRhYgdj2COW0WM3BY3SQh74BpSXxF3z7nygF9MUXt3fqrX836U1qJ8X+8PiwVx5CfAxGZMxqGBtD7ynVyFB9MhcGP7WJq6jr+e/a7l4aE8t8zWav//EvLXloEDhb9APkV8pz11a6b3/qvDraRFQ0PNl7SbqjWJWmnIy3KbDOwHCRrO/sciUbHWtXv5DgtOxzN+4QDcJAhi2cp6uOnZi+cp79CYtBK7mNfEKNnWDlRO/ygzdjyCbwtPR1hR79VQDtwQMq8lEXKt/9d7BRQMn0rS/vMSEQhXJFnKOhWnP0US58WJX1tVmh/CjNsOYSvrjdov2xAEwVY+FZhejdhQbahM/bmaxbo8YzwJ/c5iuLozupQ6z+Li9mmGokCbjYUGzMTXRJLD4Vf8N1n2JGBPYfmRqjTvZQM5kfdWALoISMm2PO6sKKyNOXPUGXwnXAWyS5qIjhkzEOKl6gA07KVqRQNigmcXN3QcMC7l6tbYTK2IDEo6Ve9yt8+EyI42awPeMGiCqG9dJq7EleTd/uhTlOdEaOCc9os7kG7I30HI5Z9HPK1M6uJJVC+Es/QGqVnYnHaojg3kV99ejwxweh83+gnR+3WvQ88+lHlJ/Kyj/r+21GbokkS9hevM8nH14w5y6kil3MBqCP00X93MwonAflWjm+FBLm6a+TNlY9aMkgQL5GF+PP+41PIn9lz+UPELYXVxT0/YdD3NxA195IST4Un3Dy071EepAwnrgE6CiQVkLf2jKiJaIKp+AUlXn8OPix/6b3tIb0Vk06e+2bbQzUH5d18k0tJmJduFiZTrTvTgaRP87qKwdh018blZUvlQdyOgLaeA5XMFF7","7Z5HhjFEXeo6ElivqWNqkFV5MwGILLZDSG+uGn6gJEGYAlfKnLeI9413gBncGGmbLlQkXxvuICfevcrc6VJET1WvbxB+FbLHAlGbUfcTNLUnK8WW2chYnanTRbj+1JyRu6Qo5riQqEpuvAHsVmZGWzcK6D5Dc3cBxNwdpqsrO8vDEWZ/MMnR0/4p+Eo999iiIKWFcNcCfnQ/ul2ta2cI0kdBIQQAPqBTUGSgxP3pVaGpL3XsQbV3cKTIgI+fcJe2BO//koaXf/8aJdatmi7IwhpPCqDgXK9huLtDsjhqL1xHNHDm+t9OErGg0muDfoJwbaOA9Lgb59XGLyldQcFC7x1/uCgc26vdzKlPInvU41lfyy9H2OgEaGAI79dRLVqmCdcUnZykEg2kRVNJuT/+eHb7Cq7+sHI1BZtP7CyxyOlrnrYT0GlgHNGaicH6gJ25t0Noi8/qih2QivO6Mp3+5pHGI5dLDHaC5T0/f6eKEdVSbDQl6c9JW0uK4lxZyBcz+UYP97zb7LgRQuamcQP8ok9/4GX97TwI66KOLcSibWZC/kbLSkSC/JlF6GwfzClwslgFUdn18BsbmkvGLkU9Vf82TgzdIdk/0PcoSXRcAV/xg9QW9n/bKwRmO+4TsCcG+4LxMPmkiokqjLxCykK74OZdnzKqg9Y7PmtT3kdiQ0JeL0n3PQHzMMOMVKOF+bWrKWMueqVhqz45QkRN2SYXfcu5+vgi7FglY8JVMmomFiqo2wvJl9HGzu5RxsT09IvwCiDIIEU0kgVqCnCD5+09xpMKDNRHFV5uM7ySCvGjaxsdbT/EGkIHInbqdMLcmuDqeCmSlVkLGgI78si5e3BkKP2L5lbjSVw6L6nm1ng9v5hgqUZdH1nr/r8bPTzlx1ebEvvv","wGjAdsr+/MO4lQ/vApgy4WJeZMEZHPyO9XVvM2eztPU+EqGrgWjsfbKtsY14UzI8hDrbhaK1exkSRf8MvYr9ux2cZkTsgKjetMNKN3u0/888TUCYvgdoXradZLPyvWPEEB1avtqUx11NPrKFxWOuxIa8tv005gnV7cgXr2S2CIkwtl71gZ2On/Vd/k1G8zL/04Lk/m4h+cUhJEf56nsNu9wJ09P3h4khc+FhtZCf/ZY/5rcuWn3oeYAGoaxqnsiH4p9PLD7WjECAatK88yx+ZtTwoKsqRTbpCbu9QmAQxmexcDVk+N65D/ZwgPckrAmgma2cdOTdhcZTgduDGnhepTsRnVyF/zPuUAjqPxXyjeVSQx66C5WsT/9ukOBgrrtx47Q2HOLbEDJMyZq5PyGsfeDNUGI9eUE05h4WJBgnBjPW/vvHn4vk20CD/01up5O8hkdiumV6Vc/w5WlfS4ED7sUo5Ria1w3zpHSFS4ncG6YDRs/DD8FlKinJdFhoA1EA/FRvLLwjU+jFyqiJAh+jJWgilsSfrfWM+nj/NOBq7GUNLAz/+SjB3TBo/a2RwuYDiJ0JXaHATU2fY91rPCLT7AB0X8rwlxltckR/g2Gvp0wcDDb4mHcVdNVME2cwGqoZDyaYDuqWmBHVcXeT2gJKCH81XPM2C39PUG1hzwDFMNqEmjio6CVphToLS0r6nbrhVBw4ZqIg/yDtQSAql2gxIugdKvo04jkTA5SIw7MQC6Axo4He0qIN/L5IJBdGoFD2L3fXAp/r4x9Qs3ueC6E82z6CA5Lxbajj6o0Re68F3kfxLqRGelcSFOSdCfJFYqAxuL9fOkC+jxr++vTrxFROi9D2sj6N19pezy0449q4o1HKjPVf8lmzjahNiE/4uMihCR7s","eqv5L54Um/nUg/q6OkRcoL37SpU05JEUYvPJnV9ruwEExWGi4JFiK4vevQmGmhqukoJj3kpyy5EFmJRFZZOKf0DPl2HqWkvNb52FY/1DWFaX4yCD01fZAIIhJTcc+U9IuHL6KaXXA1wF0Eu0m8TSPbLAFxXkRbtn/wIhKmluLeNxWAxYxF005RguzvhdUhdzorqJISvQm/kQgjWJmly5WMsf8Ud6DfQctuSe+/g1Bi2yp/3f9WxXO9aQ6uMaTQLN05P7bca2WDlCqTlzKowAFCwVqHMr60Ju3d0wbr4CJlWLZivoR7uG4v/VWpdL7HXLmVNun61dPd1FUt+MRUszaWp6RFiymXlG9/7hNwXd4kTIRfpzs4PZA24HLjw864Bflyn4hZV8pfIpdzHjSTa7sg8QT6LI206ozokmkMAcO7wjtsHkkf4dlnDU1gMSq7K+/2qk7jiBhIWFBzLTzxetWlpl4hPQZTGcMBAJNCMGzRczUeJP+HFU/FAL8Rt46pGiVv+96ANX7mQUNOa4B/cgAsDu/M52z2p0Cy26sAaFBu5O5YV0rIB+1NdrvDP6+/hAptLhwn7bWq8NUTA26l7NCd+co9tSyo84uxU9Jhzwoqn3SJoq/2i65ZVj80xH5O6lwzVToti9ls9igP88Y91IF7NhWRWeQNft5dstmR0vnw+lt6FDRtnqKoZcjV/HEkbPGp3sEi6n2NExs73cvejTBFwuMvSl8ffbLO6fMmD9q4UHLUWajsgxQT/IypliOMQL2wdlhR4g8eBlDbYHdfI9fxJbVKViqNXQVrSC8spTsNGe34/Z985tiXuh87oB68vq/FhYswLI5iisU9asCHkax5Ex46mQR1IpLc4MHCqy8dua5HTowN9xQpk4IngDWQMezbbS","UUnDloCKywkV5mEQzAl70iSFi/rOCo3G2pM7DE2OfZnGel7KCo2667CnHgwidINSSBPQxfJ7ulFxfcZ2BA3IXLN6ZCfxPH7J2cOR8mruPE23Ouy6i/LfAO/46R8rG/mt8Vl86BL2UW1bTKzh5FPde5k+lnnqL7qkp18Uo4ovL4DZXmBGNHbVAtfiXtwqMjiBpkfpGeqdxcnUBTveM1/LjxvXJx9WirpxyBeLkBfDuyfR9PiYIGQIlnxDtay+yODR81v4d++b+BxuOfff/0JoTFuqhH69dTJiCCUcl1oMAUfQ8iQs46SgdGcxSa5FQQaSR3Vkx0okmiHsxSi2/ue5k4B7hL6Rmp7h5bWCStaBMrLpYah7AooAFaBy4bkF4LJfJ1+BkPSiafXCbDf00KlfavgC3yjlS5aM9w9l2lCHjgG7o/Y4ESIjfZY3X5TAf3+KDHSJmuulDo6Mce22D9zpmDWpEhmp20PeuFuzvGKwPf2Na/MlmoYAxtFamPmqEoxH/ek06n8gAqncAAA="].join("");
const PLAY_SEATED_CHARACTER_URLS=Object.freeze({'character-01':PLAY_SEATED_CHARACTER01_URL,'character-02':GMWW_SERVER_BASE+'/characters/seated-v296/character-02/front.webp','character-03':GMWW_SERVER_BASE+'/characters/seated-v297/character-03/front.webp' ,'character-04':GMWW_SERVER_BASE+'/characters/seated-v300/character-04/front.webp'});
function playCharacterSitting(member,now=playNow()){return Number(member?.seatId||0)>0||(member?.villageActivity==='sitting'&&Number(member?.sitUntil||0)>now)}
function playCharacterVisualUrl(member,frame=1,direction='right',now=playNow()){const id=playActiveCharacterId(member?.gameCharacterId);return playCharacterSitting(member,now)?PLAY_SEATED_CHARACTER_URLS[id]:playCharacterFrameUrl(id,frame,direction)}
function playCharacterRendererApi(){return window.GMWW_CHARACTER_RENDERER||null}
function playCharacterAnimationCommand(member,{moving=false,sitting=false,effect='alive'}={}){const base=member?.characterAnimation&&typeof member.characterAnimation==='object'?member.characterAnimation:{};const state=effect==='dead'?'dead':sitting?'sitting':moving?(base.state==='running'?'running':'walking'):(member?.ready?'ready':'idle');const motion=state==='dead'?'dead':state==='sitting'?'sit':state==='running'?'run':state==='walking'?'walk':state==='ready'?'ready':'idle-breathe';return{...base,characterId:playActiveCharacterId(member?.gameCharacterId),state,motion,facing:moving?playWalkDirection(member):(base.facing==='left'?'left':'right'),activity:String(member?.villageActivity||base.activity||'idle')}}
function playRigTextureUrl(characterId,facing='right'){return playCharacterFrameUrl(characterId,1,facing)}
function playMountCharacterRig(host,member,{moving=false,sitting=false,effect='alive'}={}){const api=playCharacterRendererApi(),id=playActiveCharacterId(member?.gameCharacterId);if(!api||api.rendererKind(id,{sitting})!=='segmented-skeletal')return false;api.mount(host,{characterId:id,command:playCharacterAnimationCommand(member,{moving,sitting,effect}),sitting,textureUrl:playRigTextureUrl});return true}
function playUpdateCharacterRig(host,member,{moving=false,sitting=false,effect='alive'}={}){const api=playCharacterRendererApi();if(!api)return false;return api.update(host,playCharacterAnimationCommand(member,{moving,sitting,effect}),{textureUrl:playRigTextureUrl})}
function playNow(){return Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0)}
function playWalkFrame(member,now=playNow()){if(member?.movementStatus!=='moving'||!member?.moveStartedAt)return 1;return (Math.floor(Math.max(0,now-Number(member.moveStartedAt))/95)%6)+1}
function playSeatStats(){
  const players=playLiveMembers(),configured=Number(playSceneRuntime.room?.seatCount||playSceneState.seatCount)||24,highestSeat=Math.max(0,...players.map(p=>Number(p?.seatId)||0)),seatCount=Math.max(24,Math.min(30,Math.max(configured,players.length,highestSeat))),occupied=new Set(players.map(p=>Number(p?.seatId||0)).filter(n=>n>=1&&n<=seatCount));
  return{seatCount,occupied:occupied.size,available:Math.max(0,seatCount-occupied.size)}
}
function playSetBusy(on){
  playSceneRuntime.busy=!!on;
  for(const id of ['playPrimaryAction','playNext','playBack','playEndGame','playExitVillage']){const el=document.getElementById(id);if(el)el.disabled=!!on}
  renderPlayGatherToolbar(); // Restore button interactivity immediately when a request completes.
}
function playFlashError(message){
  playSceneRuntime.lastError=String(message||'Không thể thực hiện thao tác.');
  const title=document.getElementById('playPhaseTitle');
  if(title)title.textContent=playSceneRuntime.lastError;
  setTimeout(()=>renderPlayRealtimeHeader(),1800);
}
async function playRoomApi(path='',opts={}){
  if(!isLivePlayRoom())throw new Error('Chưa có Phòng Online.');
  return gmApi('/api/gm/rooms/'+encodeURIComponent(playSceneState.roomCode)+path,opts);
}
function disconnectPlaySocket(){if(playSceneRuntime.socketReconnect){clearTimeout(playSceneRuntime.socketReconnect);playSceneRuntime.socketReconnect=0}if(playSceneRuntime.roomSyncTimer){clearTimeout(playSceneRuntime.roomSyncTimer);playSceneRuntime.roomSyncTimer=0}if(playSceneRuntime.pollTimer){clearInterval(playSceneRuntime.pollTimer);playSceneRuntime.pollTimer=0}try{playSceneRuntime.socket?.close(1000,'GM_ROOM_CHANGED')}catch{}playSceneRuntime.socket=null;playSceneRuntime.socketRoomCode=''}
function stopPlayGlobalVillagePoll(){if(playSceneRuntime.villagePollTimer){clearInterval(playSceneRuntime.villagePollTimer);playSceneRuntime.villagePollTimer=0}}
async function playSyncGlobalVillageMotion(forceRender=false){
  if(isLivePlayRoom())return null;
  try{
    const before=playPlayerRenderSignature(),res=await fetch(GMWW_SERVER_BASE+'/api/village?ts='+Date.now(),{cache:'no-store'}),d=await res.json();
    if(!res.ok||d?.ok===false)throw new Error(d?.message||d?.error||('HTTP '+res.status));
    if(Number.isFinite(Number(d?.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now();
    const rows=(Array.isArray(d?.players)?d.players:[]).map(p=>{const participantId=String(p?.participantId||''),loginId=String(p?.loginId||participantId.replace(/^member:/,''));return{...p,participantId:participantId||('member:'+loginId),kind:'member',loginId,online:p?.online!==false}});
    playSceneRuntime.players=rows;playSceneRuntime.lastSyncAt=Date.now();setPlayRealtimeState('live');
    const changed=before!==playPlayerRenderSignature();
    if(forceRender||changed)renderPlayPlayers();else syncPlayMovementTicker();
    renderPlayRealtimeHeader();return d
  }catch(err){setPlayRealtimeState('offline');return null}
}
function ensurePlayGlobalVillagePoll(){
  if(isLivePlayRoom()){stopPlayGlobalVillagePoll();return}
  if(playSceneRuntime.villagePollTimer)return;
  playSyncGlobalVillageMotion(true);
  playSceneRuntime.villagePollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!playSceneRuntime.busy)playSyncGlobalVillageMotion(false)},250)
}
function ensurePlayRealtimePoll(){if(!isLivePlayRoom()){if(playSceneRuntime.pollTimer){clearInterval(playSceneRuntime.pollTimer);playSceneRuntime.pollTimer=0}ensurePlayGlobalVillagePoll();return}stopPlayGlobalVillagePoll();if(playSceneRuntime.pollTimer)return;playSceneRuntime.pollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!playSceneRuntime.busy&&(!playSceneRuntime.socket||playSceneRuntime.socket.readyState!==WebSocket.OPEN))playSyncRoom(false)},750)}
function playPlayerRenderSignature(players=playSceneRuntime.players){return (Array.isArray(players)?players:[]).map(p=>[String(p?.loginId||p?.participantId||''),Number(p?.seatId||0),String(p?.gameCharacterId||''),String(p?.movementStatus||''),String(p?.villageActivity||''),String(p?.moveId||''),String(p?.characterAnimation?.state||''),String(p?.characterAnimation?.motion||''),String(p?.characterAnimation?.facing||''),p?.online===false?'0':'1',p?.ready?'1':'0'].join(':')).sort().join('|')}
function connectPlaySocket(){
  if(!isLivePlayRoom()){disconnectPlaySocket();setPlayRealtimeState('offline');return}
  const code=String(playSceneState.roomCode);
  if(playSceneRuntime.socket&&playSceneRuntime.socketRoomCode===code&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(playSceneRuntime.socket.readyState)){
    setPlayRealtimeState(playSceneRuntime.socket.readyState===WebSocket.OPEN?'live':'connecting');return
  }
  disconnectPlaySocket();setPlayRealtimeState('connecting');
  const base=String(GMWW_SERVER_BASE||'').replace(/^http:/,'ws:').replace(/^https:/,'wss:').replace(/\/$/,'');let ws;
  try{ws=new WebSocket(base+'/ws/'+encodeURIComponent(code))}catch{setPlayRealtimeState('offline');return}
  playSceneRuntime.socket=ws;playSceneRuntime.socketRoomCode=code;
  ws.onopen=()=>{if(playSceneRuntime.socket===ws){setPlayRealtimeState('live');ensurePlayRealtimePoll()}};
  ws.onmessage=e=>{try{
    const d=JSON.parse(e.data||'{}'),movementEvent=d.type==='player_move'||d.type==='player_move_complete',gameEvent=['night_turn','room_cycle','auto_gm'].includes(d.type);
    if(!['room_state','player_move','player_move_complete','night_turn','room_cycle','auto_gm'].includes(d.type)||String(playSceneState.roomCode)!==code)return;
    setPlayRealtimeState('live');
    const beforePlayerSig=playPlayerRenderSignature();
    if(Number.isFinite(Number(d.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now();
    if(gameEvent){
      const room=d.room||playSceneRuntime.room;
      if(room){playSceneRuntime.room=room;if(Object.prototype.hasOwnProperty.call(room,'autoGM'))playSceneState.autoGM=room.autoGM!==false;const serverPhase=String(room.phase||'lobby').toLowerCase(),cyclePhase=String(room.cyclePhase||d.phase||'').toLowerCase(),cycleNight=Math.max(0,Number(room.cycleNight||d.night)||0);if(['running','started','game','playing'].includes(serverPhase)){playSceneState.step='battle';if(cyclePhase==='night'){playSceneState.phase='night';playSceneState.night=Math.max(1,cycleNight)}else if(cyclePhase==='morning'||cyclePhase==='day'){playSceneState.phase='day';playSceneState.night=Math.max(1,cycleNight)}}}
      if(d.runtime)playSceneRuntime.nightRuntime=d.runtime;else if(d.nightRuntime)playSceneRuntime.nightRuntime=d.nightRuntime;
      if(Array.isArray(d.players))playSceneRuntime.players=d.players;
      playSceneRuntime.lastSyncAt=Date.now();savePlayScene();renderPlayScene();
      if(playSceneRuntime.roomSyncTimer)clearTimeout(playSceneRuntime.roomSyncTimer);
      playSceneRuntime.roomSyncTimer=setTimeout(()=>{playSceneRuntime.roomSyncTimer=0;playSyncRoom(true)},180);return
    }
    const previousGmStage=playSceneRuntime.room?.gmStage;
    playSceneRuntime.room=d.room||playSceneRuntime.room;
    if(Array.isArray(d.players))playSceneRuntime.players=d.players;
    if(d.room?.gmStage&&d.room.gmStage!==previousGmStage&&!playStagePublishPending&&['room','seats','game','roles','deal'].includes(d.room.gmStage)&&['lobby','waiting'].includes(String(d.room.phase||'lobby'))){
      playSceneState.step=d.room.gmStage;savePlayScene();renderPlayScene();return;
    }
    playSceneRuntime.lastSyncAt=Date.now();
    if(d.room&&Object.prototype.hasOwnProperty.call(d.room,'autoGM'))playSceneState.autoGM=d.room.autoGM!==false;
    const playerRenderChanged=beforePlayerSig!==playPlayerRenderSignature();
    // Room-state heartbeats can contain an in-flight move too. Keep the player layer hot
    // instead of rebuilding the whole scene, so GM sees the same smooth movement as Player Web.
    if(movementEvent||d.type==='room_state'){if(playerRenderChanged)renderPlayPlayers();syncPlayMovementTicker();renderPlayRealtimeHeader()}
    else renderPlayScene()
  }catch{}};
  ws.onclose=()=>{if(playSceneRuntime.socket===ws){playSceneRuntime.socket=null;playSceneRuntime.socketRoomCode='';setPlayRealtimeState('connecting');if(isLivePlayRoom()&&String(playSceneState.roomCode)===code)playSceneRuntime.socketReconnect=setTimeout(connectPlaySocket,650)}};
  ws.onerror=()=>{if(playSceneRuntime.socket===ws)setPlayRealtimeState('offline')};
}
function playRoomDisplayName(){
  if(!isLivePlayRoom())return'SẢNH CHỜ';
  const runtimeName=String(playSceneRuntime.room?.roomName||'').trim();if(runtimeName)return playReadableRoomName(runtimeName);
  const hit=playRoomRegistry().find(x=>String(x?.roomCode||'')===String(playSceneState.roomCode||''));
  return playReadableRoomName(hit?.roomName)
}
function playReadableRoomName(value){const name=String(value||'').trim();return !name||/^(Phòng GMWW|Phòng Online)$/i.test(name)?'Làng Asahi':name}
function playVisibleStageLabel(){
  if(playSceneState.phase==='night')return 'Đêm '+Math.max(1,Number(playSceneState.night)||1);
  if(playSceneState.phase==='day')return 'Ngày '+Math.max(1,Number(playSceneState.night)||1);
  // The top timeline is the single authoritative label for all seven setup stages.
  const key=PLAY_STEPS.includes(playSceneState.step)?playSceneState.step:'lobby';
  const timelineButton=Array.from(document.querySelectorAll('[data-play-step]')).find(el=>el.dataset?.playStep===key);
  return String(timelineButton?.querySelector('b')?.textContent||PLAY_STEP_COPY[key]?.t||'Sảnh chờ').trim();
}
function renderPlayRealtimeHeader(){
  // Room-state / presence websocket events must never replace the current stage with the room name.
  const label=playVisibleStageLabel(),title=document.getElementById('playPhaseTitle');
  if(title)title.textContent=label;
  const next=document.getElementById('playPhasePill');
  if(next)next.setAttribute('aria-label','Bước hiện tại '+label+' · Chạm để tiếp tục');
}
function clearStalePlayRoom(){disconnectPlaySocket();playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;playSceneState.selectedMemberIds=[];playSceneState.step='room';playSceneState.phase='lobby';playSceneRuntime.room=null;playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;savePlayScene();gmwwSendGmPresence(true);renderPlayScene()}
const PLAY_ROOM_REGISTRY_KEY='gmww_v306_room_registry';
const playRoomUiState={stage:'rooms',selectedCode:'',editorMode:'',lastTapCode:'',lastTapAt:0};
function playRoomRegistry(){try{const v=JSON.parse(localStorage.getItem(PLAY_ROOM_REGISTRY_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function savePlayRoomRegistry(rows){try{localStorage.setItem(PLAY_ROOM_REGISTRY_KEY,JSON.stringify((rows||[]).slice(0,30)))}catch{}}
function rememberPlayRoom(roomCode,gmToken,room={}){
  roomCode=String(roomCode||'');gmToken=String(gmToken||'');if(!roomCode||!gmToken)return;
  const rows=playRoomRegistry().filter(x=>String(x.roomCode)!==roomCode);
  rows.unshift({roomCode,gmToken,roomName:playReadableRoomName(room.roomName||document.getElementById('playCreateRoomName')?.value),roomMode:room.roomMode==='offline'?'offline':'online',seatCount:Math.max(1,Math.min(30,Number(room.seatCount)||playSceneState.seatCount||12)),enabled:room.enabled!==false,updatedAt:Date.now()});savePlayRoomRegistry(rows)
}
function forgetPlayRoom(roomCode){savePlayRoomRegistry(playRoomRegistry().filter(x=>String(x.roomCode)!==String(roomCode||'')))}
function setPlayRoomUiStage(stage){playRoomUiState.stage=stage;renderPlayCreateRoomSheet()}
async function selectPlayExistingRoom(r){
  playRoomUiState.selectedCode=String(r.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode';
  playSceneState.roomCode=String(r.roomCode);playSceneState.gmToken=String(r.gmToken);playSceneState.roomMode=r.roomMode==='offline'?'offline':'online';playSceneState.seatCount=Math.max(1,Math.min(30,Number(r.seatCount)||12));playSceneState.roomEnabled=r.enabled!==false;savePlayScene();gmwwSendGmPresence(true);renderPlayCreateRoomSheet();
  const data=await playSyncRoom(true);
  if(!data){if(!isLivePlayRoom()){forgetPlayRoom(r.roomCode);playRoomUiState.selectedCode='';playRoomUiState.stage='rooms'}renderPlayCreateRoomSheet();return}
  // Repair only legacy auto-generated rooms; never change intentionally sized rooms.
  const legacy=/^(Phòng GMWW|Phòng Online)$/i.test(String(data.room?.roomName||'').trim());
  const idle=['lobby','waiting'].includes(String(data.room?.phase||'lobby').toLowerCase());
  if(legacy&&idle){
    if(Number(data.room?.seatCount)===12&&!data.room?.seatsLocked&&!(data.players||[]).length){
      await playUpdateRoomSettings({seatCount:24});
    }
    try{const renamed=await playRoomApi('/rename',{method:'POST',body:JSON.stringify({roomName:'Làng Asahi'})});playSceneRuntime.room=renamed.room||playSceneRuntime.room}catch(err){playFlashError(err.message)}
    rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
    renderPlayScene();
  }
  renderPlayCreateRoomSheet()
}
function renderPlayCreatedRooms(){
  const list=document.getElementById('playCreatedRoomList');if(!list)return;const rows=playRoomRegistry();
  list.innerHTML='';
  if(!rows.length){list.innerHTML='<div class="play-room-empty">Chưa có phòng</div>';return}
  rows.forEach(r=>{
    const b=document.createElement('button');b.type='button';b.className='play-created-room'+(String(r.roomCode)===String(playRoomUiState.selectedCode)?' active':'');
    b.innerHTML='<span><b>'+playEsc(playReadableRoomName(r.roomName))+'</b><small>'+playEsc((r.roomMode||'online').toUpperCase())+'</small></span><i class="'+(r.enabled!==false?'on':'')+'">'+(r.enabled!==false?'ON':'OFF')+'</i>';
    b.onclick=async()=>{
      const now=Date.now(),code=String(r.roomCode),doubleTap=playRoomUiState.lastTapCode===code&&(now-playRoomUiState.lastTapAt)<480;
      playRoomUiState.lastTapCode=code;playRoomUiState.lastTapAt=now;
      if(doubleTap){if(String(playSceneState.roomCode)!==code)await selectPlayExistingRoom(r);openPlayRoomEditor(false);return}
      await selectPlayExistingRoom(r)
    };
    list.appendChild(b)
  })
}
function openPlayRoomEditor(isNew=false){
  const ed=document.getElementById('playRoomEditor');if(!ed)return;
  playRoomUiState.editorMode=isNew?'new':'existing';playRoomUiState.stage='edit';
  if(isNew){
    playRoomUiState.selectedCode='';playSceneState.seatCount=24;savePlayScene();
    const n=document.getElementById('playCreateRoomName');if(n)n.value='';
  }else{
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');
    const n=document.getElementById('playCreateRoomName');if(n)n.value=String(playSceneRuntime.room?.roomName||playRoomRegistry().find(x=>String(x.roomCode)===playRoomUiState.selectedCode)?.roomName||'Làng Asahi')
  }
  renderPlayCreateRoomSheet();renderPlayScene();setTimeout(()=>document.getElementById('playCreateRoomName')?.focus(),40)
}
async function savePlayRoomEditor(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){
    playSceneState.roomMode='online';playSceneState.seatCount=24;playSceneState.roomEnabled=true;savePlayScene();
    const ok=await playCreateRoom();if(!ok)return;
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode';
  }else{
    if(!isLivePlayRoom())return;
    if(!(await playSaveRoomName()))return;
    rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode'
  }
  renderPlayCreateRoomSheet();renderPlayScene()
}
function renderPlayCreateRoomSheet(){
  const live=isLivePlayRoom(),room=playSceneRuntime.room||{},stage=playRoomUiState.stage;
  const name=document.getElementById('playCreateRoomName'),seatCount=document.getElementById('playCreateRoomSeatCount'),modeToggle=document.getElementById('playRoomModeToggle'),toggle=document.getElementById('playCreateRoomEnabled'),reset=document.getElementById('playCreateRoomReset'),del=document.getElementById('playCreateRoomDelete');
  if(seatCount&&document.activeElement!==seatCount)seatCount.value=String(playSceneState.seatCount||12);
  if(name&&live&&playRoomUiState.editorMode!=='new'&&document.activeElement!==name)name.value=String(room.roomName||name.value||'Làng Asahi');
  const online=playSceneState.roomMode==='online';if(modeToggle){modeToggle.classList.toggle('is-online',online);modeToggle.setAttribute('aria-pressed',String(online));const b=modeToggle.querySelector('b');if(b)b.textContent=online?'ONLINE':'OFFLINE'}
  const enabled=playSceneState.roomEnabled===true;if(toggle){toggle.classList.toggle('is-on',enabled);toggle.setAttribute('aria-pressed',String(enabled));const b=toggle.querySelector('b');if(b)b.textContent=enabled?'ON':'OFF'}
  document.getElementById('playRoomModeStep')?.classList.toggle('hidden',!(['mode','settings'].includes(stage)&&!!playRoomUiState.selectedCode));
  document.getElementById('playRoomSettingsStep')?.classList.add('hidden');
  document.getElementById('playRoomEditor')?.classList.toggle('hidden',stage!=='edit');
  if(reset)reset.disabled=false;if(del)del.disabled=false;renderPlayCreatedRooms();
}
async function playToggleRoomEnabled(){
  if(playSceneRuntime.busy)return;
  const enabled=playSceneState.roomEnabled!==true;
  if(!isLivePlayRoom()){playSceneState.roomEnabled=enabled;savePlayScene();renderPlayCreateRoomSheet();return}
  playSetBusy(true);
  try{const data=await playRoomApi('/enabled',{method:'POST',body:JSON.stringify({enabled})});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneState.roomEnabled=data?.room?.enabled!==false;if(!playSceneState.roomEnabled){playSceneRuntime.players=[];playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';playSceneState.step='room'}savePlayScene();rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});renderPlayCreateRoomSheet();renderPlayScene()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playResetCreatedRoom(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){const n=document.getElementById('playCreateRoomName');if(n){n.value='';n.focus()}return}
  if(!isLivePlayRoom())return;
  if(!confirm('RESET Phòng '+playSceneState.roomCode+'?\nToàn bộ người chơi, vị trí và dữ liệu ván trong phòng sẽ được làm mới.'))return;
  const keepEnabled=playSceneState.roomEnabled===true;
  playSetBusy(true);
  try{
    const body={transactionId:'room-page-'+Date.now(),expectedResetVersion:Number(playSceneRuntime.room?.resetVersion||0)};
    const data=await playRoomApi('/reset',{method:'POST',body:JSON.stringify(body)});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;playSceneState.selectedMemberIds=[];playSceneState.step='room';playSceneState.phase='lobby';
    if((data?.room?.enabled!==false)!==keepEnabled){const en=await playRoomApi('/enabled',{method:'POST',body:JSON.stringify({enabled:keepEnabled})});playSceneRuntime.room=en.room||playSceneRuntime.room}
    playSceneState.roomEnabled=keepEnabled;savePlayScene();await playSyncRoom(true);renderPlayCreateRoomSheet()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playDeleteCreatedRoom(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){const n=document.getElementById('playCreateRoomName');if(n)n.value='';playRoomUiState.editorMode='';playRoomUiState.stage='rooms';renderPlayCreateRoomSheet();return}
  if(!isLivePlayRoom())return;
  if(!confirm('XOÁ Phòng '+playSceneState.roomCode+'?\nPhòng sẽ biến mất khỏi Player Web và không thể tham gia lại.'))return;
  playSetBusy(true);
  try{const oldCode=playSceneState.roomCode;await playRoomApi('/delete',{method:'POST',body:'{}'});forgetPlayRoom(oldCode);clearStalePlayRoom();playRoomUiState.selectedCode='';playRoomUiState.editorMode='';playRoomUiState.stage='rooms';renderPlayCreateRoomSheet()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playSaveRoomName(){
  if(!isLivePlayRoom())return true;
  const input=document.getElementById('playCreateRoomName'),name=input?.value.trim()||'Làng Asahi',old=String(playSceneRuntime.room?.roomName||'');
  if(name===old)return true;
  try{const data=await playRoomApi('/rename',{method:'POST',body:JSON.stringify({roomName:name})});playSceneRuntime.room=data.room||playSceneRuntime.room;return true}
  catch(err){playFlashError(err.message);return false}
}
async function playCreateRoom(){
  if(playSceneRuntime.busy)return false;
  playSetBusy(true);
  try{
    const response=await fetch(GMWW_SERVER_BASE+'/api/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomName:document.getElementById('playCreateRoomName')?.value.trim()||'Làng Asahi',roomMode:playSceneState.roomMode,enabled:playSceneState.roomEnabled===true,seatMoveMode:'instant',seatCount:playSceneState.seatCount})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data?.roomCode)throw new Error(data?.message||data?.error||'Không tạo được Phòng.');
    playSceneState.roomCode=String(data.roomCode);playSceneState.gmToken=String(data.gmToken||'');playSceneState.seatMoveMode='instant';playSceneState.selectedMemberIds=[];playSceneState.step='room';playSceneState.phase='lobby';playSceneState.night=0;playSceneState.artifactCount=0;savePlayScene();gmwwSendGmPresence(true);
    await playSyncRoom(true);rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||data||{});try{memberAdminState.loaded=false;await loadMembers(false)}catch{}renderPlayCreateRoomSheet();renderPlayScene();return true
  }catch(err){playFlashError(err.message);return false}
  finally{playSetBusy(false)}
}
async function playCreateRoomNext(){
  if(playSceneRuntime.busy)return;
  if(!isLivePlayRoom()){
    await openPlayCreateRoomSheet();
    playFlashError('Hãy chọn một phòng có thật hoặc nhấn MỚI, đặt tên và LƯU trước khi tiếp tục.');
    return;
  }
  const sheet=document.getElementById('playCreateRoomSheet');
  if(sheet&&!sheet.classList.contains('hidden')&&String(playRoomUiState.selectedCode)!==String(playSceneState.roomCode)){
    playFlashError('Chọn một phòng trong danh sách trước khi tiếp tục.');
    return;
  }
  if(!playSceneRuntime.room){
    const checked=await playSyncRoom(true);
    if(!checked?.room){await openPlayCreateRoomSheet();return}
  }
  if(!(await playSaveRoomName()))return;
  rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
  playGatherToolsDismissed=false;playSceneState.step='seats';playSceneState.activePlayerId='';savePlayScene();void playPublishStage('seats');
  playRoomUiState.stage='rooms';playRoomUiState.editorMode='';
  document.getElementById('playCreateRoomSheet')?.classList.add('hidden');
  renderPlayScene();
}
async function playSyncRoom(force=false){
  if(!isLivePlayRoom())return null;
  if(playSceneRuntime.busy&&!force)return null;
  const syncSerial=++playSceneRuntime.syncSerial;
  try{
    const data=await playRoomApi('');
    if(syncSerial!==playSceneRuntime.syncSerial)return data;
    if(Number.isFinite(Number(data?.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(data.serverTime)-Date.now();
    playSceneRuntime.room=data.room||null;playSceneRuntime.players=Array.isArray(data.players)?data.players:[];playSceneRuntime.assignments=Array.isArray(data.assignments)?data.assignments:[];playSceneRuntime.gameConfig=data.gameConfig||null;playSceneRuntime.artifactCycle=data.artifactCycle||{count:0,max:3};playSceneRuntime.nightRuntime=data.nightRuntime||null;playSceneRuntime.winProposal=data.winProposal||null;playSceneRuntime.activeEffects=Array.isArray(data.activeEffects)?data.activeEffects:[];playSceneRuntime.lastSyncAt=Date.now();playSceneRuntime.lastError='';
    const syncedServerPhase=String(data?.room?.phase||'lobby').toLowerCase();playSceneState.artifactCount=['running','started','game','playing'].includes(syncedServerPhase)?Math.max(0,Math.min(Number(playSceneRuntime.artifactCycle?.max??3),Number(playSceneRuntime.artifactCycle?.count||0))):0;const serverMemberIds=playSceneRuntime.players.filter(p=>p?.kind==='member'&&p?.loginId).map(p=>String(p.loginId));if(serverMemberIds.length||playSceneState.step!=='members'||playSceneState.roomMode!=='online')playSceneState.selectedMemberIds=serverMemberIds;
    const room=data.room||{},serverPhase=String(room.phase||'lobby').toLowerCase(),cyclePhase=String(room.cyclePhase||'').toLowerCase(),cycleNight=Math.max(0,Number(room.cycleNight)||0);playSceneState.autoGM=room.autoGM!==false;playSceneState.roomEnabled=room.enabled!==false;playSceneState.roomMode=room.roomMode==='offline'?'offline':'online';playSceneState.seatMoveMode=room.seatMoveMode==='walk'?'walk':'instant';playSceneState.seatCount=Math.max(1,Math.min(30,Number(room.seatCount)||playSceneState.seatCount||12));
    if(!playStagePublishPending&&['room','seats','game','roles','deal'].includes(room.gmStage))playSceneState.step=room.gmStage;
    if(['running','started','game','playing'].includes(serverPhase)){
      playSceneState.step='battle';
      if(cyclePhase==='night'){playSceneState.phase='night';playSceneState.night=Math.max(1,cycleNight)}
      else if(cyclePhase==='morning'||cyclePhase==='day'){playSceneState.phase='day';playSceneState.night=Math.max(1,cycleNight)}
      else{playSceneState.phase='lobby';playSceneState.night=Math.max(0,cycleNight)}
    }else if(serverPhase==='role_delivery'){
      if(PLAY_STEPS.indexOf(playSceneState.step)<PLAY_STEPS.indexOf('deal'))playSceneState.step='deal';
      playSceneState.phase='lobby';
    }else if(serverPhase==='lobby'||serverPhase==='waiting'){
      playSceneState.phase='lobby';
      if(playSceneState.step==='battle')playSceneState.step=data.assignments?.length?'deal':'room';
    }
    savePlayScene();connectPlaySocket();ensurePlayRealtimePoll();renderPlayScene();return data;
  }catch(err){
    if(syncSerial!==playSceneRuntime.syncSerial)return null;
    playSceneRuntime.lastError=String(err.message||err);
    if([401,403,404].includes(Number(err?.status))){forgetPlayRoom(playSceneState.roomCode);clearStalePlayRoom();if(force)playFlashError('Phòng cũ không còn tồn tại. Đã trả GM về Làng hiện tại.');return null}
    if(force)playFlashError('Không đồng bộ được Phòng '+playSceneState.roomCode+'. '+playSceneRuntime.lastError);
    return null;
  }
}
function playMovementPoint(m,pos,now=playNow()){if(m?.movementStatus!=='moving')return pos;const p=globalThis.GMWW_VILLAGE_LAYOUT.interpolate(m,now);return[p.x,p.y]}
function stopPlayMovementTicker(){if(playSceneRuntime.moveTicker){cancelAnimationFrame(playSceneRuntime.moveTicker);playSceneRuntime.moveTicker=0}}
function renderPlayGmToken(){
  const ring=document.getElementById('playPlayerRing'),actor=gmwwGmActorAt(Date.now());if(!ring)return;ring.querySelector('[data-play-gm-rider]')?.remove();if(!actor)return;
  const pt=playMapDisplay(actor.x,actor.y),el=document.createElement('button'),runDir=Number(actor?.to?.x??actor.x)-Number(actor?.from?.x??actor.x)<0?-1:1;el.type='button';el.dataset.playGmRider='1';const idlePhase=Math.floor(Date.now()/2200)%12,gmAction=actor.moving?(actor.gait==='run'?'run':'walk'):(idlePhase===8?'shake':idlePhase===10?'howl':'idle');el.className='play-player-token is-gm-rider gm-action-'+gmAction+(String(playSceneState.activePlayerId||'')==='gm:online'?' is-active':'')+(actor.moving?' is-moving':'');el.style.setProperty('--gm-run-dir',String(runDir));el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(15+Math.round(pt[1]));el.innerHTML='<div class="play-player-over"><b>GM</b><small>'+playEsc(actor.status)+'</small></div><div class="play-player-avatar"><div class="gm-wolf-character" data-gm-wolf-runtime="1"><div class="gm-wolf-shadow"></div><div class="gm-wolf-sprite"><img class="gm-wolf-segment gm-wolf-body" src="gm/gm-white-wolf.webp" alt="GM cưỡi sói trắng"><img class="gm-wolf-segment gm-wolf-rear-legs" src="gm/gm-white-wolf.webp" alt=""><img class="gm-wolf-segment gm-wolf-front-legs" src="gm/gm-white-wolf.webp" alt=""><img class="gm-wolf-segment gm-wolf-head" src="gm/gm-white-wolf.webp" alt=""></div></div></div>';el.onclick=e=>{e.stopPropagation();playSceneState.activePlayerId='gm:online';savePlayScene();renderPlayScene();openPlayGMSheet()};ring.appendChild(el)
}
function updatePlayGmToken(now=Date.now()){
  const ring=document.getElementById('playPlayerRing'),actor=gmwwGmActorAt(now);if(!ring||!actor)return false;let el=ring.querySelector('[data-play-gm-rider]');if(!el){renderPlayGmToken();el=ring.querySelector('[data-play-gm-rider]');if(!el)return false}const pt=playMapDisplay(actor.x,actor.y),runDir=Number(actor?.to?.x??actor.x)-Number(actor?.from?.x??actor.x)<0?-1:1;el.style.setProperty('--gm-run-dir',String(runDir));el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(15+Math.round(pt[1]));el.classList.toggle('is-moving',actor.moving);el.classList.remove('gm-action-idle','gm-action-walk','gm-action-run','gm-action-shake','gm-action-howl');const idlePhase=Math.floor(now/2200)%12,gmAction=actor.moving?(actor.gait==='run'?'run':'walk'):(idlePhase===8?'shake':idlePhase===10?'howl':'idle');el.classList.add('gm-action-'+gmAction);const status=el.querySelector('small');if(status)status.textContent=actor.status;return true
}
function playMovementFrame(){
  const rows=playVillageMembers().filter(p=>p?.movementStatus==='moving'||p?.villageActivity==='sitting');
  const now=playNow(),ring=document.getElementById('playPlayerRing');if(!ring){playSceneRuntime.moveTicker=0;return}let active=updatePlayGmToken(now);
  for(const m of rows){
    const id=String(m?.loginId||m?.participantId||''),el=ring.querySelector('[data-play-player-id="'+CSS.escape(id)+'"]');if(!el)continue;
    const moving=m?.movementStatus==='moving',sitting=playCharacterSitting(m,now);active=active||moving||sitting;
    if(moving){const point=playMovementPoint(m,null,now),pt=playMapDisplay(point[0],point[1]);el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(10+Math.round(pt[1]))}
    const host=el.querySelector('.play-player-avatar'),effect=playPlayerEffect(m.loginId),rigUpdated=host?playUpdateCharacterRig(host,m,{moving,sitting,effect}):false,im=rigUpdated?null:host?.querySelector('img'),direction=moving?playWalkDirection(m):'right',frame=moving?playWalkFrame(m,now):1,src=playCharacterVisualUrl(m,frame,direction,now),key=(sitting?'sit':direction)+':'+frame;
    el.dataset.walkDir=direction;el.classList.toggle('is-moving',moving);el.classList.toggle('is-sitting',sitting);if(im&&im.dataset.walkKey!==key){im.dataset.walkKey=key;im.src=src}
    const status=el.querySelector('.play-player-over small');if(status&&moving)status.textContent='ĐANG DI CHUYỂN';
  }
  if(active)playSceneRuntime.moveTicker=requestAnimationFrame(playMovementFrame);else playSceneRuntime.moveTicker=0
}
function syncPlayMovementTicker(){
  const active=!!gmwwGmPresenceState?.online||playVillageMembers().some(p=>p?.movementStatus==='moving'||p?.villageActivity==='sitting');
  if(active&&!playSceneRuntime.moveTicker)playSceneRuntime.moveTicker=requestAnimationFrame(playMovementFrame);
  else if(!active)stopPlayMovementTicker()
}
function renderPlayPlayers(){
  const ring=document.getElementById('playPlayerRing');if(!ring)return;
  const previewNew=playRoomUiState.editorMode==='new'&&!document.getElementById('playCreateRoomSheet')?.classList.contains('hidden');
  const seating=previewNew||(isLivePlayRoom()&&['room','seats'].includes(playSceneState.step)&&!playSceneRuntime.room?.seatsLocked),members=previewNew?[]:playVillageMembers(),seatCount=previewNew?24:playSeatStats().seatCount,positions=playSeatPositions(seatCount),bySeat=new Map((previewNew?[]:playLiveMembers()).filter(m=>Number(m?.seatId||0)>0).map(m=>[Number(m.seatId),m])),selectedIds=new Set((playSceneState.selectedMemberIds||[]).map(String));
  ring.innerHTML='';ring.classList.toggle('is-dense',(seating?seatCount:members.length)>16);ring.classList.toggle('is-seating',seating);
  const make=(m,pos,seatId=null)=>{
    const el=document.createElement('button'),effect=m?playPlayerEffect(m.loginId):'alive',moving=m?.movementStatus==='moving',sitting=m?playCharacterSitting(m):false,isOnlinePick=false;
    el.type='button';if(seatId)el.dataset.seatId=String(seatId);if(m)el.dataset.playPlayerId=String(m.loginId||m.participantId||'');
    el.className='play-player-token'+(m&&String(m.loginId)===String(playSceneState.activePlayerId)?' is-active':'')+(m&&selectedIds.has(String(m.loginId))?' is-roster-selected':'')+(effect!=='alive'?' is-'+effect:'')+(!m?' is-empty is-position':'')+(moving?' is-moving':'')+(sitting?' is-sitting':'')+(m&&seatId?' is-seat-occupied':'');
    const mapPoint=moving?playMovementPoint(m,pos,playNow()):pos,pt=playMapDisplay(mapPoint[0],mapPoint[1]);el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(10+Math.round(pt[1]));
    const name=m?.displayName||(seatId?('Vị trí '+seatId):'Trong Làng'),initial=(name.trim().charAt(0)||'•').toUpperCase(),effectLabel=effect==='dead'?'ĐÃ CHẾT':effect==='frozen'?'ĐÓNG BĂNG':effect==='expelled'?'BỊ ĐUỔI':null,statusLabel=m?(isOnlinePick?(selectedIds.has(String(m.loginId))?'ĐÃ CHỌN':'ONLINE'):(moving?'ĐANG DI CHUYỂN':(effectLabel||((m.online?'ONLINE':'OFFLINE')+' • '+(m.ready?'READY':'CHƯA READY'))))):'TRỐNG';
    const assignment=m?(playSceneRuntime.assignments||[]).find(a=>String(a?.loginId||'')===String(m.loginId||'')):null,roleLabel=assignment?.roleName||assignment?.roleId||'',showRole=!!roleLabel&&PLAY_STEPS.indexOf(playSceneState.step)>=PLAY_STEPS.indexOf('roles');el.innerHTML=(m?'<div class="play-player-over"><b>'+playEsc(name)+'</b><small>'+playEsc(statusLabel)+'</small></div>':'')+'<div class="play-player-avatar">'+(m?'<img alt="">':'<img class="play-seat-leaf-art" src="village/seat-leaf.webp?v=320" alt="" aria-hidden="true">')+'</div>'+(m?(showRole?'<span class="play-player-role">'+playEsc(roleLabel)+'</span>':''):'<b>Vị trí '+seatId+'</b>');
    el.setAttribute('aria-label',name+' • '+statusLabel);el.title=name+' • '+statusLabel;
    if(m){
      const host=el.querySelector('.play-player-avatar'),direction=moving?playWalkDirection(m):'right',frame=moving?playWalkFrame(m,playNow()):1,characterSrc=playCharacterVisualUrl(m,frame,direction),rigMounted=playMountCharacterRig(host,m,{moving,sitting,effect});el.dataset.walkDir=direction;
      if(!rigMounted){const im=host?.querySelector('img');if(im){im.src=characterSrc;im.dataset.walkKey=direction+':'+frame;im.decoding='async';im.onerror=()=>{im.onerror=null;im.replaceWith(Object.assign(document.createElement('span'),{textContent:initial}))}}}
      // A neutral preview does not assign/change the account's fixed character.
      if(!characterSrc)el.classList.add('is-character-preview');
      el.onclick=async()=>{
        const lid=String(m.loginId||'');
        if(isOnlinePick){
          const ids=new Set((playSceneState.selectedMemberIds||[]).map(String));if(ids.has(lid))ids.delete(lid);else ids.add(lid);playSceneState.selectedMemberIds=[...ids];savePlayScene();renderPlayScene();return
        }
        if(seating&&playSceneState.activePlayerId&&String(playSceneState.activePlayerId)!==lid&&Number(m.seatId||0)>0){
          const selected=selectedPlayPlayer();if(selected&&String(selected.loginId)!==lid){await updateSelectedPlayerSeat({seatId:Number(m.seatId),swap:true});return}
        }
        playSceneState.activePlayerId=lid;savePlayScene();renderPlayScene()
      }
    }else if(seating){
      el.onclick=async()=>openPlaySeatAssignSheet(seatId)
    }
    ring.appendChild(el)
  };
  if(seating){
    for(let i=0;i<seatCount;i++){const seatId=i+1,m=bySeat.get(seatId)||null,pos=positions[i]||[50,57];make(m,pos,seatId)}
    const waiting=playLiveMembers().filter(m=>!Number(m?.seatId||0));for(const [i,m] of waiting.entries())make(m,playRoamPoint(m.loginId),null)
  }else{
    members.sort((a,b)=>String(a.loginId).localeCompare(String(b.loginId))).forEach((m,i)=>{
      const sid=Number(m?.seatId||0),x=m?.positionX,y=m?.positionY,valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
      const pos=sid>=1&&sid<=seatCount?positions[sid-1]:valid(x)&&valid(y)?Object.values(globalThis.GMWW_VILLAGE_LAYOUT.clampPoint(x,y)):playRoamPoint(m.loginId,i,members.length);make(m,pos,sid||null)
    })
  }
  renderPlayGmToken();syncPlayMovementTicker();
}
async function renderPlayCards(){
  const selected=(playSceneRuntime.assignments.length?playSceneRuntime.assignments:(Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[])).find(a=>String(a?.loginId||'')===String(playSceneState.activePlayerId||'')),selectedRoleId=String(selected?.roleId||playSceneState.roleId||'');
  const role=state.cards?.find(x=>String(x.id)===selectedRoleId)||state.cards?.find(x=>String(x.legacyId)===selectedRoleId)||state.cards?.find(x=>String(x.id)===String(playSceneState.roleId))||state.cards?.[0]||null;
  const selectedArtifactId=String(selected?.artifactId||playSceneState.artifactId||''),artifact=state.artifacts?.find(x=>String(x.id)===selectedArtifactId)||state.artifacts?.find(x=>String(x.legacyId)===selectedArtifactId)||null;
  const roleName=document.getElementById('playRoleName'),artifactName=document.getElementById('playArtifactName'),roleImg=document.getElementById('playRoleArtwork'),artifactImg=document.getElementById('playArtifactArtwork');
  const stageIndex=PLAY_STEPS.indexOf(playSceneState.step),roleVisible=stageIndex>=PLAY_STEPS.indexOf('roles');
  if(roleName)roleName.textContent=roleVisible&&(selected?.roleName||role)?(selected?.roleName||role?.name||'Vai Trò'):'Chưa phân Vai Trò';
  if(artifactName)artifactName.textContent=roleVisible&&artifact?(artifact.name||'Artifact'):'Chưa có Artifact';
  if(roleImg){roleImg.style.opacity=roleVisible&&role?'1':'.28';roleImg.src=role?await resolveArtwork('cards',role.id,'thumb'):'default-artwork.webp'}
  if(artifactImg){artifactImg.style.opacity=roleVisible&&artifact?'1':'.28';artifactImg.src=artifact?await resolveArtwork('artifacts',artifact.id,'thumb'):'default-artwork.webp'}
}
function bindPlayRoomModeButtons(){const b=document.getElementById('playRoomModeToggle');if(!b)return;b.onclick=async()=>{if(playSceneRuntime.busy)return;const mode=playSceneState.roomMode==='online'?'offline':'online';playSceneState.roomMode=mode;playRoomUiState.stage='mode';savePlayScene();renderPlayCreateRoomSheet();if(isLivePlayRoom())await playUpdateRoomSettings({roomMode:mode});else renderPlayScene();renderPlayCreateRoomSheet()}}
function bindPlaySeatMoveButtons(){document.querySelectorAll('[data-play-seat-move]').forEach(b=>b.onclick=async()=>{const mode=b.dataset.playSeatMove==='walk'?'walk':'instant';playSceneState.seatMoveMode=mode;savePlayScene();if(isLivePlayRoom())await playUpdateRoomSettings({seatMoveMode:mode});else renderPlayScene()})}
async function playUpdateRoomSettings(patch={}){
  if(!isLivePlayRoom())return;playSetBusy(true);
  try{const data=await playRoomApi('/room-settings',{method:'POST',body:JSON.stringify(patch)});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.roomMode=playSceneRuntime.room?.roomMode==='offline'?'offline':'online';playSceneState.seatMoveMode=playSceneRuntime.room?.seatMoveMode==='walk'?'walk':'instant';playSceneState.seatCount=Math.max(1,Math.min(30,Number(playSceneRuntime.room?.seatCount)||playSceneState.seatCount||12));savePlayScene();rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});renderPlayScene();renderPlayCreateRoomSheet()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playAddSeat(){const {seatCount}=playSeatStats();if(seatCount>=30){playFlashError('Phòng đã đạt tối đa 30 vị trí.');return}await playUpdateRoomSettings({seatCount:seatCount+1})}
function renderPlayContext(){
  const k=document.getElementById('playContextKicker'),t=document.getElementById('playContextTitle'),x=document.getElementById('playContextText'),actions=document.getElementById('playContextActions'),step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;
  const artifactMax=Math.max(0,Math.min(30,Number(playSceneRuntime.artifactCycle?.max??playSceneRuntime.gameConfig?.artifactLimitPerCycle??3)||0));
  if(playSceneState.phase==='night'){
    const runtime=playSceneRuntime.nightRuntime,current=runtime&&!runtime.completed?runtime.queue?.[runtime.cursor]:null,total=runtime?.queue?.length||0,done=Math.min(total,Number(runtime?.cursor||0));
    if(k)k.textContent='ĐÊM '+Math.max(1,playSceneState.night)+(total?' • '+Math.min(done+1,total)+'/'+total:'');
    if(t)t.textContent=current?.label||(runtime?.completed?'Đã hoàn tất các lượt Ban Đêm':'Đang chuẩn bị thứ tự Đêm');
    if(x){
      if(current?.kind==='wolf-introduction')x.textContent='Bầy Sói ơi dậy đi nhìn mặt nhau. Bước này chỉ có ở Đêm 1.';
      else if(current?.kind==='early-artifact')x.textContent='Lượt Artifact gọi sớm. Nếu dùng tại đây, lượt chính của Artifact này sẽ tự bỏ qua.';
      else if(current?.kind==='role')x.textContent='Gọi Vai Trò này thực hiện chức năng. Các người chơi cùng Vai Trò được gom chung một lượt.';
      else if(current?.kind==='artifact-main')x.textContent='Lượt chính của Artifact. Artifact đã dùng ở lượt gọi sớm sẽ không xuất hiện lại.';
      else x.textContent='Toàn bộ thứ tự đêm đang được server giữ và đồng bộ cho GM.';
      const deadline=Date.parse(runtime?.deadlineAt||'')||0;if(deadline>0&&!runtime?.completed){const remain=Math.max(0,Math.ceil((deadline-Date.now())/1000));x.textContent+=(x.textContent?' • ':'')+remain+' giây'}
    }
    if(actions)actions.innerHTML='<button class="play-action-chip active" type="button"><span>☾</span><b>Đêm '+Math.max(1,playSceneState.night)+'</b></button><button class="play-action-chip" type="button"><span>✦</span><b>Artifact '+Math.min(artifactMax,playSceneState.artifactCount)+'/'+artifactMax+'</b></button>';
  }else if(playSceneState.phase==='day'){
    if(k)k.textContent='BAN NGÀY';if(t)t.textContent='Công bố người chết → Thảo luận → Bỏ phiếu';if(x){x.textContent='Chỉ hiện kết quả người chết rồi chuyển sang Ngày. Bỏ phiếu điện tử dùng chung cho hai chế độ Online.';const sec=Math.max(0,Number((playSceneRuntime.gameConfig?.timing||playSceneState.gameTiming||{}).villageDiscussionSec)||0),started=Date.parse(playSceneRuntime.room?.cycleStartedAt||'')||0;if(sec&&started){const remain=Math.max(0,Math.ceil((started+sec*1000-Date.now())/1000));x.textContent+=' • '+remain+' giây'}};
    if(actions)actions.innerHTML='<button class="play-action-chip active" type="button"><span>☀</span><b>Ban Ngày</b></button><button class="play-action-chip" type="button"><span>✓</span><b>Bỏ phiếu</b></button>';
  }else{
    if(k)k.textContent=step.k;if(t)t.textContent=step.t;
    if(x){
      if(isLivePlayRoom()&&(playSceneState.step==='room'||playSceneState.step==='members')){const s=playSeatStats();x.textContent=(playSceneState.roomMode==='offline'?'OFFLINE':'ONLINE')+' • '+s.occupied+'/'+s.seatCount+' ghế có người • '+s.available+' ghế trống.'}
      else if(playSceneState.step==='game')x.textContent=(playSceneRuntime.gameConfig?.name||playSceneState.gameName||'Chưa chọn Ván Mẫu')+' • '+playRolePlanTotal()+'/'+playLiveMembers().length+' Vai Trò.';
      else if(playSceneState.step==='seats'){const st=playSeatStats();x.textContent=st.occupied+'/'+st.seatCount+' vị trí đã có người • '+st.available+' vị trí còn trống'+(playSceneRuntime.room?.seatsLocked?' • ĐÃ KHÓA VỊ TRÍ':'');}
      else if(playSceneState.step==='roles')x.textContent='Đã cấu hình '+playRolePlanTotal()+' Vai Trò. Nhấn PHÂN VAI để chia ngẫu nhiên; chưa gửi xuống Player Web.';
      else if(playSceneState.step==='deal')x.textContent=(playSceneState.assignmentsPreview?.length||0)+'/'+playLiveMembers().length+' Thành Viên đã được phân. Nhấn PHÁT VAI để gửi lên Player Web.';
      else x.textContent=playSceneRuntime.lastError||step.x;
    }
    if(actions){
      if(playSceneState.step==='deal'&&(playSceneState.assignmentsPreview?.length||0)){
        actions.innerHTML='<button class="play-action-chip" data-play-reroll-role type="button"><span>↻</span><b>Vai Trò</b></button><button class="play-action-chip" data-play-reroll-artifact type="button"><span>✦</span><b>Artifact</b></button><button class="play-action-chip" data-play-cycle-artifact type="button"><span>⇄</span><b>Đổi Artifact</b></button>';
        actions.querySelector('[data-play-reroll-role]')?.addEventListener('click',()=>playBuildAssignments({preserveArtifacts:true}));
        actions.querySelector('[data-play-reroll-artifact]')?.addEventListener('click',playRerollArtifacts);
        actions.querySelector('[data-play-cycle-artifact]')?.addEventListener('click',playCycleActiveArtifact);
      }else if(playSceneState.step==='room'){actions.innerHTML=''}else if(playSceneState.step==='members'){
        const chosen=(playSceneState.selectedMemberIds||[]).length,online=(memberAdminState.members||[]).filter(m=>m?.online).length;
        actions.innerHTML=playSceneState.roomMode==='online'?'<button class="play-action-chip active" disabled><span>●</span><b>'+chosen+' đã chọn / '+online+' Online</b></button>':'<button class="play-action-chip active" data-play-open-roster type="button"><span>☰</span><b>Danh sách Người Chơi</b></button>';
        actions.querySelector('[data-play-open-roster]')?.addEventListener('click',openPlayRosterSheet)
      }else if(playSceneState.step==='game'){
        actions.innerHTML='<button class="play-action-chip active" type="button" disabled><span>▣</span><b>'+playEsc(playSceneState.gameName||'Ván Mẫu')+'</b></button>'
      }else if(playSceneState.step==='seats'){
        const st=playSeatStats(),locked=!!playSceneRuntime.room?.seatsLocked;
        actions.innerHTML='<button class="play-action-chip" data-play-call-members type="button"><span>♧</span><b>GỌI THÀNH VIÊN</b></button><button class="play-action-chip active" data-play-seat-manual type="button"><span>☝</span><b>THỦ CÔNG</b></button><button class="play-action-chip" data-play-random-seats type="button"><span>⚄</span><b>NGẪU NHIÊN</b></button><button class="play-action-chip '+(locked?'active':'')+'" data-play-seat-lock-toggle type="button"><span>'+ (locked?'🔒':'🔓') +'</span><b>'+(locked?'MỞ KHÓA XẾP CHỖ':'CHỐT XẾP CHỖ')+'</b></button><button class="play-action-chip play-seat-total" disabled><span>●</span><b>'+st.occupied+'/'+st.seatCount+'</b></button>';
        actions.querySelector('[data-play-call-members]')?.addEventListener('click',playCallOnlineMembers);
        actions.querySelector('[data-play-random-seats]')?.addEventListener('click',playRandomSeatRemaining);
        actions.querySelector('[data-play-seat-lock-toggle]')?.addEventListener('click',()=>playSetSeatLock(!locked));
        actions.querySelector('[data-play-seat-manual]')?.addEventListener('click',()=>playFlashError('Chạm chiếc lá trên sân rồi chọn người chơi cho vị trí đó.'))
      }else if(playSceneState.step==='roles'){actions.innerHTML='<button class="play-action-chip" data-play-assign-auto type="button"><b>TỰ ĐỘNG</b></button><button class="play-action-chip" data-play-assign-random type="button"><b>NGẪU NHIÊN</b></button>';actions.querySelector('[data-play-assign-auto]')?.addEventListener('click',()=>{try{playBuildAssignments({random:false})}catch(e){playFlashError(e.message)}});actions.querySelector('[data-play-assign-random]')?.addEventListener('click',()=>{try{playBuildAssignments()}catch(e){playFlashError(e.message)}})}else actions.innerHTML='';
    }
  }
  if(actions&&playSceneState.step==='battle'&&playSceneState.activePlayerId){
    const m=playLiveMembers().find(p=>String(p?.loginId||'')===String(playSceneState.activePlayerId)),stateLabel=playPlayerEffect(playSceneState.activePlayerId);
    actions.insertAdjacentHTML('beforeend','<button class="play-action-chip play-state-chip '+(stateLabel==='frozen'?'active':'')+'" data-play-player-state="frozen" type="button"><span>❄</span><b>Đóng băng</b></button><button class="play-action-chip play-state-chip '+(stateLabel==='expelled'?'active':'')+'" data-play-player-state="expelled" type="button"><span>↗</span><b>Đuổi</b></button><button class="play-action-chip play-state-chip '+(stateLabel==='dead'?'active':'')+'" data-play-player-state="dead" type="button"><span>✕</span><b>Chết</b></button><button class="play-action-chip play-state-chip" data-play-player-state="clear_state" type="button"><span>↺</span><b>Gỡ trạng thái</b></button>');
    if(t&&m)t.textContent=m.displayName+' • '+(stateLabel==='alive'?'Đang sống':stateLabel==='frozen'?'Đóng băng':stateLabel==='expelled'?'Bị đuổi':'Đã chết');
    bindPlayPlayerStateActions()
  }
  if(actions&&isLivePlayRoom()&&playSceneState.activePlayerId&&playSceneState.phase==='lobby'){
    actions.insertAdjacentHTML('beforeend','<button class="play-action-chip" data-play-manage-seat type="button"><span>◌</span><b>Đổi / bỏ vị trí</b></button>');
    actions.querySelector('[data-play-manage-seat]')?.addEventListener('click',openPlaySeatSheet)
  }
}
let playStagePublishQueue=Promise.resolve(),playStagePublishPending=0;
function playPublishStage(step){
  if(!isLivePlayRoom()||!['room','seats','game','roles','deal','battle'].includes(step))return Promise.resolve(null);
  const code=String(playSceneState.roomCode);playStagePublishPending++;
  const write=async()=>{
    try{
      if(code!==String(playSceneState.roomCode))return null;
      const data=await playRoomApi('/stage',{method:'POST',body:JSON.stringify({step})});
      if(data?.room&&code===String(playSceneState.roomCode))playSceneRuntime.room=data.room;
      return data;
    }catch(err){
      if(code===String(playSceneState.roomCode))playFlashError('Không đồng bộ được bước chơi lên Server. '+String(err?.message||''));
      return null;
    }finally{playStagePublishPending--}
  };
  playStagePublishQueue=playStagePublishQueue.then(write,write);
  return playStagePublishQueue;
}
function setPlayStep(step){if(step==='members')step='seats';if(step==='seats'&&playSceneState.step!=='seats')playGatherToolsDismissed=false;if(step==='lobby'&&playSceneState.step!=='lobby'){void playReturnToLobby();return}if(!PLAY_STEPS.includes(step))return;if(['game','roles','deal','battle'].includes(step)&&!playSceneRuntime.room?.seatsLocked){playFlashError('Khóa vị trí trước khi chọn ván.');return;}playSceneState.step=step;if(step!=='battle'){playSceneState.phase='lobby';playSceneState.night=0;playSceneState.artifactCount=0}savePlayScene();renderPlayScene();void playPublishStage(step)}
function advancePlaySetup(dir=1){const i=PLAY_STEPS.indexOf(playSceneState.step),next=Math.max(0,Math.min(PLAY_STEPS.length-1,i+dir));setPlayStep(PLAY_STEPS[next])}
async function playSetServerCycle(phase,night){
  const serverPhase=phase==='day'?'morning':'night',n=Math.max(1,Number(night)||1),cycleKey=serverPhase+'-'+n;
  await playRoomApi('/cycle',{method:'POST',body:JSON.stringify({phase:serverPhase,night:n,cycleKey})});await playSyncRoom(true);
}
function syncPlayAutoAdvance(){
  // V2.67: live-room Auto GM is authoritative on the Cloudflare Durable Object.
  // The IPA only renders the server deadline; it never owns the transition timer.
  if(playSceneRuntime.autoTurnTimer){clearTimeout(playSceneRuntime.autoTurnTimer);playSceneRuntime.autoTurnTimer=0}
  playSceneRuntime.autoTurnKey='';
}
async function togglePlayAutoGM(){
  if(playSceneRuntime.busy)return;
  const enabled=!playSceneState.autoGM;
  if(!isLivePlayRoom()){playSceneState.autoGM=enabled;savePlayScene();renderPlayScene();return}
  playSetBusy(true);
  try{
    const data=await playRoomApi('/auto',{method:'POST',body:JSON.stringify({enabled})});
    playSceneRuntime.room=data?.room||playSceneRuntime.room;playSceneState.autoGM=data?.room?.autoGM!==false;savePlayScene();renderPlayScene()
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}
function renderPlayGatherToolbar(){
  const bar=document.getElementById('playGatherToolbar');if(!bar)return;
  const visible=playSceneState.phase==='lobby'&&playSceneState.step==='seats'&&isLivePlayRoom();
  bar.classList.toggle('hidden',!visible);
  if(!visible)return;
  const members=playLiveMembers(),st=playSeatStats(),locked=!!playSceneRuntime.room?.seatsLocked;
  const count=document.getElementById('playGatherCount');
  if(count)count.textContent=members.length+' người • '+st.occupied+'/'+st.seatCount+' vị trí';
  for(const id of ['playGatherCall','playGatherRandom','playGatherManual']){
    const el=document.getElementById(id);if(el)el.disabled=locked||playSceneRuntime.busy;
  }
  const confirm=document.getElementById('playGatherConfirm');
  if(confirm){confirm.disabled=!!playSceneRuntime.busy;const b=confirm.querySelector('b');if(b)b.textContent=locked?'MỞ KHÓA':'CHỐT VỊ TRÍ';}
  const disband=document.getElementById('playGatherDisband');if(disband)disband.disabled=!!playSceneRuntime.busy||!members.length;
  bar.classList.remove('is-auto-hidden');bar.dataset.autoHidden='0';
  if(typeof bar.gmwwGatherClampOnscreen==='function')requestAnimationFrame(bar.gmwwGatherClampOnscreen);
}
async function playGatherCallMembers(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi gọi người.');return}
  if(playSceneState.roomMode==='offline'){await openPlayRosterSheet();return}
  await playCallOnlineMembers();
}
async function playGatherRandomize(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi xếp ngẫu nhiên.');return}
  if(!playLiveMembers().length){
    if(playSceneState.roomMode==='offline'){await openPlayRosterSheet();return}
    await playCallOnlineMembers();
  }
  if(playLiveMembers().length)await playRandomSeatRemaining();
}
function openPlayDisbandSheet(){
  if(!isLivePlayRoom())return;
  renderPlayDisbandSheet();document.getElementById('playDisbandSheet')?.classList.remove('hidden');
}
function closePlayDisbandSheet(){document.getElementById('playDisbandSheet')?.classList.add('hidden')}
function renderPlayDisbandSheet(){
  const list=document.getElementById('playDisbandList'),all=document.getElementById('playDisbandAll');if(!list)return;
  const members=playLiveMembers();list.innerHTML='';
  for(const p of members){
    const lid=String(p?.loginId||''),row=document.createElement('div');row.className='play-disband-member';
    row.innerHTML='<span><b>'+playEsc(p.displayName||lid)+'</b><small>'+(Number(p.seatId||0)?'Vị trí '+Number(p.seatId):'Chưa có vị trí')+'</small></span><button type="button" class="play-disband-one">MỜI RA</button>';
    row.querySelector('button').onclick=()=>{void playDisbandOne(lid)};list.appendChild(row)
  }
  if(!members.length)list.innerHTML='<div class="member-empty">Phòng hiện không có người chơi.</div>';
  if(all)all.disabled=playSceneRuntime.busy||!members.length;
}
async function playDisbandOne(loginId){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  const p=playLiveMembers().find(m=>String(m?.loginId||'')===String(loginId));if(!p)return;
  if(!confirm('Đưa '+(p.displayName||loginId)+' ra khỏi Phòng và trở về Sảnh chờ?'))return;
  playSetBusy(true);
  try{
    const data=await playRoomApi('/kick',{method:'POST',body:JSON.stringify({participantId:p.participantId||('member:'+loginId)})});
    if(data?.ok!==true)throw new Error('Server chưa xác nhận đưa người chơi ra khỏi phòng.');
    if(String(playSceneState.activePlayerId)===String(loginId))playSceneState.activePlayerId='';
    await playSyncRoom(true);renderPlayDisbandSheet();renderPlayScene();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{playSetBusy(false);renderPlayDisbandSheet()}
}
async function playDisbandAll(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  const members=playLiveMembers();if(!members.length)return;
  if(!confirm('GIẢI TÁN '+members.length+' NGƯỜI CHƠI? Tất cả sẽ về Sảnh chờ. Phòng vẫn được giữ lại.'))return;
  playSetBusy(true);
  try{
    const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:[],replace:true})});
    if(data?.ok!==true||Number(data?.selectedCount)!==0)throw new Error('Server chưa xác nhận giải tán phòng.');
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:[];
    playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';savePlayScene();
    closePlayDisbandSheet();await playSyncRoom(true);renderPlayScene();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{playSetBusy(false)}
}
function playGatherManual(){
  if(!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi xếp thủ công.');return}
  openPlaySeatManualSheet();
}
async function playGatherConfirm(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){await playSetSeatLock(false);return}
  if(!playLiveMembers().length){playFlashError('Gọi người chơi vào làng trước khi chốt vị trí.');return}
  await playFinishSeating();
}
async function advancePlayPhase(){
  if(playSceneRuntime.busy)return;
  if(playSceneState.step==='lobby'){setPlayStep('room');await openPlayCreateRoomSheet();return}
  if(playSceneState.step==='room'){if(isLivePlayRoom()){await playCreateRoomNext();return}openPlayCreateRoomSheet();return}
  if(playSceneState.step==='game'){openPlayGameSheet();return}
  if(playSceneState.step==='seats'){await playFinishSeating();return}
  if(playSceneState.step==='roles'){try{playBuildAssignments()}catch(err){playFlashError(err.message)}return}
  if(playSceneState.step==='deal'){await playDealRoles();return}
  if(playSceneState.step!=='battle'){advancePlaySetup(1);return}
  playSetBusy(true);
  try{
    let room=playSceneRuntime.room;
    if(!room){const synced=await playSyncRoom(true);room=synced?.room||null}
    const serverPhase=String(playSceneRuntime.room?.phase||room?.phase||'').toLowerCase();
    if(!['running','started','game','playing'].includes(serverPhase)){
      if(!playSceneRuntime.assignments.length)throw new Error('Hãy Phân Vai và Phát Vai trước khi Bắt Đầu Đêm 1.');
      await playRoomApi('/start',{method:'POST',body:JSON.stringify({matchId:playSceneRuntime.room?.matchId||('match-'+Date.now()),matchRevision:Number(playSceneRuntime.room?.matchRevision||0)+1})});
      await playSetServerCycle('night',1);return;
    }
    if(playSceneState.phase==='lobby'){await playSetServerCycle('night',Math.max(1,playSceneState.night||1))}
    else if(playSceneState.phase==='night'){
      const runtime=playSceneRuntime.nightRuntime;
      if(runtime&&!runtime.completed){
        const data=await playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'next'})});playSceneRuntime.nightRuntime=data?.runtime||runtime;await playSyncRoom(true);return
      }
      await playSetServerCycle('day',Math.max(1,playSceneState.night))
    }else{await playSetServerCycle('night',Math.max(1,playSceneState.night)+1)}
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}
function renderPlayScene(){
  const shell=document.getElementById('playShell');if(!shell)return;shell.dataset.phase=playSceneState.phase;shell.dataset.step=playSceneState.step;
  if(playSceneRuntime.setupPopupStep!==playSceneState.step){playSceneRuntime.setupPopupStep=playSceneState.step;playSceneRuntime.setupPopupClosed=false}
  const phase=playSceneState.phase,night=Math.max(0,Number(playSceneState.night)||0),put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
  const artifactMax=Math.max(0,Math.min(30,Number(playSceneRuntime.artifactCycle?.max??playSceneRuntime.gameConfig?.artifactLimitPerCycle??3)||0));
  put('playRoomCode',playSceneState.roomCode||'—');put('playArtifactCount',Math.min(artifactMax,Math.max(0,Number(playSceneState.artifactCount)||0))+'/'+artifactMax);
  const auto=document.getElementById('playAutoGM');if(auto){auto.classList.toggle('is-on',!!playSceneState.autoGM);auto.setAttribute('aria-pressed',String(!!playSceneState.autoGM));auto.setAttribute('aria-label',playSceneState.autoGM?'Auto GM đang bật':'Auto GM đang tắt');auto.title=playSceneState.autoGM?'Auto GM: Bật':'Auto GM: Tắt'}
  applyPlayAudioState();
  if(phase==='night'){const rt=playSceneRuntime.nightRuntime,cur=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;put('playPhaseOrb','☾');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge','ĐÊM '+Math.max(1,night));put('playCoreKicker',cur?.kind==='early-artifact'?'ARTIFACT GỌI SỚM':cur?.kind==='artifact-main'?'ARTIFACT':cur?.kind==='role'?'VAI TRÒ':night===1?'MỞ ĐẦU ĐÊM 1':'BAN ĐÊM');put('playCoreTitle',cur?.label||'HOÀN TẤT ĐÊM '+Math.max(1,night));put('playCoreHint',rt?.completed?'Đã xong toàn bộ lượt. Có thể chuyển sang Ban Ngày.':cur?.kind==='wolf-introduction'?'Bầy Sói nhìn mặt nhau trước khi vào lượt chức năng.':'Thực hiện bước hiện tại rồi nhấn Tiếp theo.')}
  else if(phase==='day'){put('playPhaseOrb','☀');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge','NGÀY '+Math.max(1,night));put('playCoreKicker','LÀNG ƠI! DẬY ĐI');put('playCoreTitle','BAN NGÀY');put('playCoreHint','Công bố kết quả, thảo luận và bỏ phiếu.')}
  else{const step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;put('playPhaseOrb','◉');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge',playVisibleStageLabel().toUpperCase());put('playCoreKicker','GMWW • SÂN CHƠI');put('playCoreTitle',step.k);put('playCoreHint',step.x)}
  document.querySelectorAll('[data-play-step]').forEach((b,idx)=>{const cur=PLAY_STEPS.indexOf(playSceneState.step);b.classList.toggle('active',idx===cur);b.classList.toggle('done',idx<cur);if(idx===cur)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  const stepStatus=document.getElementById('playPhasePill');if(stepStatus)stepStatus.setAttribute('aria-label','Bước hiện tại '+playVisibleStageLabel()+' · Chạm để tiếp tục');
  const primary=document.getElementById('playPrimaryLabel');
  if(primary){const step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;primary.textContent=step.t.toUpperCase()}
  const core=document.querySelector('.play-village-core'),fire=playMapDisplay(50,49.7);if(core){core.style.left=fire[0]+'%';core.style.top=fire[1]+'%';}
  renderPlayPlayers();renderPlayCards();renderPlayGatherToolbar();if(isLivePlayRoom())stopPlayGlobalVillagePoll();else ensurePlayGlobalVillagePoll();syncPlayAutoAdvance();
}

function playFactionLabel(role){const f=String(role?.factionId||role?.faction||'').toLowerCase();if(f==='wolf'||f.includes('sói')||f.includes('soi'))return'Phe Sói';if(f==='third'||f.includes('ba')||f.includes('third'))return'Phe Ba';return'Phe Dân'}
function playRolePlanTotal(){return Object.values(playSceneState.rolePlan||{}).reduce((s,v)=>s+Math.max(0,Number(v)||0),0)}
function playSortedRoles(){
  return [...(state.cards||[])].sort((a,b)=>{
    const pa=prefs.cards?.[a.id]||{},pb=prefs.cards?.[b.id]||{},sa=pa.starred?Number(pa.starOrder||999):9999,sb=pb.starred?Number(pb.starOrder||999):9999;
    return sa-sb||String(a.name||'').localeCompare(String(b.name||''),'vi');
  });
}
function playFavoriteArtifacts(){
  return [...(state.artifacts||[])].filter(a=>prefs.artifacts?.[a.id]?.starred).sort((a,b)=>(Number(prefs.artifacts?.[a.id]?.starOrder||9999)-Number(prefs.artifacts?.[b.id]?.starOrder||9999))||String(a.name||'').localeCompare(String(b.name||''),'vi'));
}
function updatePlayArtifactToggle(){
  const box=document.getElementById('playArtifactsEnabled'),hint=document.getElementById('playArtifactPoolHint'),pool=playFavoriteArtifacts(),selected=playTemplateSelectedArtifacts();
  if(box)box.checked=!!playSceneState.artifactsEnabled;
  const actionSec=document.getElementById('playArtifactActionSec');if(actionSec)actionSec.disabled=!playSceneState.artifactsEnabled;
  if(hint)hint.textContent=!pool.length?'Chưa có Artifact ★ trong Thư Viện':playSceneState.artifactsEnabled?(selected.length+' / '+pool.length+' Artifact ★ được sử dụng • vuốt ngang để xem hoặc bỏ chọn'):'Artifact đang tắt, không phân phát.';
  renderPlayArtifactPicker();
}
function playTemplateSelectedRoles(){
  const plan=playSceneState.rolePlan||{},orders=playSceneState.roleOrders||{};
  return playSortedRoles().filter(r=>Number(plan[r.id])>0).sort((a,b)=>(Number(orders[a.id]||999)-Number(orders[b.id]||999))||String(a.name||'').localeCompare(String(b.name||''),'vi'));
}
function playTemplateSetCount(id,value){
  const n=Math.max(0,Math.min(20,Math.trunc(Number(value)||0)));
  playSceneState.rolePlan={...(playSceneState.rolePlan||{})};
  if(n)playSceneState.rolePlan[id]=n;else delete playSceneState.rolePlan[id];
  if(n&&!Number(playSceneState.roleOrders?.[id])){
    playSceneState.roleOrders=playSceneState.roleOrders||{};
    playSceneState.roleOrders[id]=Math.max(0,...Object.values(playSceneState.roleOrders).map(Number).filter(Number.isFinite))+1;
  }
  savePlayScene();void renderPlayGameRoles();updatePlayGameRoleCount();
}
function playTemplateMoveRole(id,delta){
  const selected=playTemplateSelectedRoles(),index=selected.findIndex(r=>String(r.id)===String(id)),next=index+delta;
  if(index<0||next<0||next>=selected.length)return;
  const ordered=selected.slice();[ordered[index],ordered[next]]=[ordered[next],ordered[index]];
  playSceneState.roleOrders=playSceneState.roleOrders||{};
  ordered.forEach((role,i)=>{playSceneState.roleOrders[role.id]=i+1});
  savePlayScene();void renderPlayGameRoles();
}
function playTemplateRenderCatalog(){
  const picker=document.getElementById('playGameRolePicker');if(!picker)return;
  const term=String(document.getElementById('playTemplateRoleSearch')?.value||'').trim().toLocaleLowerCase('vi'),
    faction=document.getElementById('playTemplateRoleFaction')?.value||'all',
    starred=!!document.getElementById('playTemplateOnlyStarred')?.checked;
  const roles=playSortedRoles().filter(r=>(!term||(String(r.name||'')+' '+playFactionLabel(r)).toLocaleLowerCase('vi').includes(term))&&(faction==='all'||playFactionLabel(r)===faction)&&(!starred||!!prefs.cards?.[r.id]?.starred));
  // Enforce horizontal scroll at runtime: legacy IPA stylesheets may override the catalog grid.
  const swipeRules={display:'flex',flexDirection:'row',flexWrap:'nowrap',overflowX:'auto',overflowY:'hidden',maxHeight:'none',gridTemplateColumns:'none',touchAction:'pan-x pan-y',webkitOverflowScrolling:'touch'};
  for(const [key,value] of Object.entries(swipeRules))picker.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');
  picker.replaceChildren();
  for(const role of roles){
    const count=Math.max(0,Number(playSceneState.rolePlan?.[role.id])||0),chosen=count>0;
    const button=document.createElement('button');button.type='button';
    button.className='play-template-card'+(chosen?' is-picked':'');
    button.style.setProperty('flex','0 0 112px','important');
    button.style.setProperty('width','112px','important');
    button.style.setProperty('max-width','112px','important');
    button.setAttribute('aria-pressed',String(chosen));
    button.setAttribute('aria-label',(chosen?'Bỏ chọn ':'Chọn ')+String(role.name||'Vai Trò'));
    button.innerHTML='<span class="play-template-artwork"><img loading="lazy" alt=""><span class="play-template-select-indicator" aria-hidden="true">'+(chosen?'✓':'+')+'</span></span><span class="play-template-card-name">'+playEsc(role.name||'Vai Trò')+'</span>';
    const img=button.querySelector('img');
    void resolveArtwork('cards',role.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    button.onclick=()=>playTemplateSetCount(role.id,chosen?0:1);
    picker.appendChild(button);
  }
  if(!roles.length)picker.innerHTML='<p class="play-template-help">Không tìm thấy lá bài. Hãy bỏ chọn bộ lọc ★ hoặc chọn tất cả phe.</p>';
}
async function renderPlayGameRoles(){
  const list=document.getElementById('playGameRoleList');if(!list)return;list.replaceChildren();
  playSceneState.roleOrders=playSceneState.roleOrders||{};
  playTemplateRenderCatalog();
  const roles=playTemplateSelectedRoles();
  for(let i=0;i<roles.length;i++){
    const role=roles[i],count=Math.max(1,Number(playSceneState.rolePlan?.[role.id])||1),
      order=Math.max(1,Math.min(99,Number(playSceneState.roleOrders?.[role.id])||i+1));
    const row=document.createElement('div');row.className='play-template-selected-row';row.dataset.roleId=role.id;
    row.innerHTML='<div class="play-template-role-identity"><img class="play-template-selected-thumb" loading="lazy" alt=""><div class="play-game-role-copy"><b>'+playEsc(role.name||'Vai Trò')+'</b><small>'+playEsc(playFactionLabel(role))+'</small></div></div><div class="play-template-role-values"><label>Số lá<input data-role-count type="number" inputmode="numeric" min="1" max="20" value="'+count+'"></label><label>Thứ tự<input data-role-order type="number" inputmode="numeric" min="1" max="99" value="'+order+'"></label><div class="play-template-arrows"><button type="button" data-move-up aria-label="Đưa lên">↑</button><button type="button" data-move-down aria-label="Đưa xuống">↓</button></div><button type="button" data-role-remove aria-label="Bỏ vai khỏi Ván Mẫu">×</button></div>';
    const img=row.querySelector('img');
    void resolveArtwork('cards',role.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    row.querySelector('[data-role-count]').onchange=e=>playTemplateSetCount(role.id,e.target.value);
    row.querySelector('[data-role-order]').onchange=e=>{playSceneState.roleOrders[role.id]=Math.max(1,Math.min(99,Number(e.target.value)||1));savePlayScene();void renderPlayGameRoles()};
    row.querySelector('[data-role-remove]').onclick=()=>playTemplateSetCount(role.id,0);
    row.querySelector('[data-move-up]').onclick=()=>playTemplateMoveRole(role.id,-1);
    row.querySelector('[data-move-down]').onclick=()=>playTemplateMoveRole(role.id,1);
    row.querySelector('[data-move-up]').disabled=i===0;row.querySelector('[data-move-down]').disabled=i===roles.length-1;
    list.appendChild(row);
  }
  if(!roles.length)list.innerHTML='<div class="member-empty">Chưa chọn vai trò. Chạm vào ảnh một Lá Bài phía trên để thêm vào ván.</div>';
  renderPlayGameRoleTimings();
}
function playRoleDurationSec(roleId,defaultSec){
  const values=playSceneState.roleDurations||{};
  const own=Object.prototype.hasOwnProperty.call(values,String(roleId));
  const seconds=own?values[String(roleId)]:defaultSec;
  return Math.max(0,Math.min(3600,Math.trunc(Number(seconds)||0)));
}
function renderPlayGameRoleTimings(){
  const list=document.getElementById('playGameRoleTimingList');if(!list)return;
  list.hidden=false;list.replaceChildren();
  const roles=playTemplateSelectedRoles();
  const defaultSec=Math.max(0,Math.min(3600,Math.trunc(Number(document.getElementById('playDefaultActionSec')?.value??playSceneState.gameTiming?.defaultActionSec??30)||0)));
  for(const role of roles){
    const roleId=String(role.id),custom=Object.prototype.hasOwnProperty.call(playSceneState.roleDurations||{},roleId);
    const row=document.createElement('label');row.className='play-template-role-timing'+(custom?' is-custom':'');
    row.innerHTML='<span>'+playEsc(role.name||'Vai Trò')+' (giây):</span><span class="play-role-time-input"><input type="number" inputmode="numeric" min="0" max="3600" value="'+playRoleDurationSec(roleId,defaultSec)+'" aria-label="Thời gian sử dụng '+playEsc(role.name||'Vai Trò')+' (giây)"></span>';
    row.querySelector('input').onchange=e=>{
      const value=Math.max(0,Math.min(3600,Math.trunc(Number(e.target.value)||0)));
      const customTimes={...(playSceneState.roleDurations||{})};
      if(value===defaultSec)delete customTimes[roleId];else customTimes[roleId]=value;
      playSceneState.roleDurations=customTimes;savePlayScene();renderPlayGameRoleTimings();
    };
    list.appendChild(row);
  }
  if(!roles.length)list.innerHTML='<p class="play-template-help">Hãy chọn một Ván Mẫu để thiết lập thời gian riêng.</p>';
}
function playTemplateSelectedArtifacts(){
  const allowed=new Set(Array.isArray(playSceneState.artifactIds)?playSceneState.artifactIds.map(String):[]);
  return playFavoriteArtifacts().filter(a=>allowed.has(String(a.id)));
}
function renderPlayArtifactPicker(){
  const picker=document.getElementById('playGameArtifactPicker');if(!picker)return;
  picker.replaceChildren();
  const pool=playFavoriteArtifacts(),selected=new Set((playSceneState.artifactIds||[]).map(String));
  if(!playSceneState.artifactsEnabled){picker.hidden=true;return}
  picker.hidden=false;
  for(const artifact of pool){
    const active=selected.has(String(artifact.id)),button=document.createElement('button');
    button.type='button';button.className='play-template-card'+(active?' is-picked':'');
    button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'Bỏ chọn ':'Chọn ')+String(artifact.name||'Artifact'));
    button.innerHTML='<span class="play-template-artwork"><img loading="lazy" alt=""><span class="play-template-select-indicator" aria-hidden="true">'+(active?'✓':'+')+'</span></span><span class="play-template-card-name">'+playEsc(artifact.name||'Artifact')+'</span>';
    const img=button.querySelector('img');
    void resolveArtwork('artifacts',artifact.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    button.onclick=()=>{const next=new Set((playSceneState.artifactIds||[]).map(String));if(next.has(String(artifact.id)))next.delete(String(artifact.id));else next.add(String(artifact.id));playSceneState.artifactIds=[...next];savePlayScene();updatePlayArtifactToggle()};
    picker.appendChild(button);
  }
  if(!pool.length)picker.innerHTML='<p class="play-template-help">Chưa có Artifact ★. Hãy đánh dấu trong Thư Viện trước.</p>';
}

function updatePlayGameRoleCount(){
  const mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play',need=playLiveMembers().length,total=playRolePlanTotal(),el=document.getElementById('playGameRoleCount');if(el){el.textContent=total+' lá • '+playTemplateSelectedRoles().length+' vai';el.style.color='#fff1a5'} const review=document.getElementById('playTemplatePlaySummary');if(review)review.textContent=total+' lá cho '+need+' người • '+(total===need?'Đủ số lượng':'Không khớp số người');const summary=document.getElementById('playTemplateTeamSummary');if(summary&&mode==='library'){const roles=playTemplateSelectedRoles(),counts={'Phe Dân':0,'Phe Sói':0,'Phe Ba':0};for(const role of roles)counts[playFactionLabel(role)]+=Number(playSceneState.rolePlan[role.id])||0;summary.innerHTML='<span><b>'+total+'</b>Tổng vai</span><span><b>'+counts['Phe Dân']+'</b>Dân</span><span><b>'+counts['Phe Sói']+'</b>Sói</span><span><b>'+counts['Phe Ba']+'</b>Phe Ba</span>'}
}
async function migrateV109GameTemplates(){
  if(localStorage.getItem('GMWW_V263_TEMPLATE_MIGRATION_DONE')==='1')return;
  const buckets=[];
  for(const key of ['GMWW_V109_GAME_TEMPLATES','GMWW_V1_09_GAME_TEMPLATES','GMWW_V109_STATE','GMWW_V1_09_STATE']){
    try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(raw))buckets.push(...raw);else if(raw&&typeof raw==='object'){for(const k of ['gameTemplates','templates','sampleGames','games'])if(Array.isArray(raw[k]))buckets.push(...raw[k])}}catch{}
  }
  for(const item of buckets){
    try{const cfg=item?.compiledConfig||item?.gameConfig||item;if(!cfg||!Array.isArray(cfg.roles)||!cfg.roles.length)continue;const id=String(item?.id||cfg.id||('v109-'+Math.random().toString(36).slice(2,10))),name=String(item?.name||cfg.name||'Ván Mẫu V1.09').slice(0,48);await gmApi('/api/gm/game-templates',{method:'PUT',body:JSON.stringify({id,gameConfig:{...cfg,id,name}})})}catch{}
  }
  localStorage.setItem('GMWW_V263_TEMPLATE_MIGRATION_DONE','1');
}
async function loadPlayGameTemplates(){
  try{await migrateV109GameTemplates();const data=await gmApi('/api/gm/game-templates');playSceneRuntime.gameTemplates=Array.isArray(data?.templates)?data.templates:[]}catch{playSceneRuntime.gameTemplates=[]}
  const sel=document.getElementById('playGameTemplateSelect'),mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play';if(sel){sel.innerHTML=(mode==='library'?'<option value="">Tạo Ván Mẫu mới</option>':'<option value="">Chọn Ván Mẫu</option>')+playSceneRuntime.gameTemplates.map(x=>'<option value="'+playEsc(x.id)+'">'+playEsc(x.name)+' • '+Number(x.playerCount||0)+' người</option>').join('');sel.value=playSceneState.gameTemplateId||''}
  renderGameTemplateLibrary();
}
function renderGameTemplateLibrary(){
  const box=document.getElementById('gameTemplateLibraryList');if(!box)return;box.innerHTML='';
  if(!playSceneRuntime.gameTemplates.length){box.innerHTML='<div class="member-empty">Chưa có Ván Mẫu. Nhấn + để tạo trước khi chơi.</div>';return}
  for(const t of playSceneRuntime.gameTemplates){const b=document.createElement('button');b.type='button';b.className='template-library-item';b.innerHTML='<b>'+playEsc(t.name||'Ván Mẫu')+'</b><small>'+Number(t.playerCount||0)+' người • chạm để sửa</small>';b.onclick=()=>openLibraryGameTemplate(String(t.id||''));box.appendChild(b)}
}
async function applyPlayGameTemplate(id){
  id=String(id||'');if(!id){playSceneState.gameTemplateId='';playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};await renderPlayGameRoles();updatePlayGameRoleCount();return}
  try{
    const data=await gmApi('/api/gm/game-templates/'+encodeURIComponent(id)),cfg=data?.template?.compiledConfig||data?.template?.gameConfig||null;if(!cfg)return;
    playSceneState.gameTemplateId=id;playSceneState.gameName=String(cfg.name||'Ván GMWW');playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};
    for(const r of (cfg.roles||[])){if(r?.roleId){playSceneState.rolePlan[String(r.roleId)]=Math.max(0,Number(r.count)||0);playSceneState.roleOrders[String(r.roleId)]=Math.max(1,Number(r.order)||1);const commonSec=Math.max(0,Math.min(3600,Number(cfg?.timing?.defaultActionSec??30)||0)),individualSec=Math.max(0,Math.min(3600,Number(r.actionDurationSec??commonSec)||0));if(individualSec!==commonSec)playSceneState.roleDurations[String(r.roleId)]=individualSec}}
    const templateArtifactIds=(cfg.artifacts||[]).map(a=>String(a.artifactId||'')).filter(Boolean);
    const favoriteArtifactIds=playFavoriteArtifacts().map(a=>String(a.id));
    playSceneState.artifactsEnabled=templateArtifactIds.length>0||favoriteArtifactIds.length>0;
    playSceneState.artifactIds=templateArtifactIds.length?templateArtifactIds:favoriteArtifactIds;
    playSceneState.gameTiming={villageDiscussionSec:Math.max(0,Number(cfg?.timing?.villageDiscussionSec??300)||0),wolfDiscussionSec:Math.max(0,Number(cfg?.timing?.wolfDiscussionSec??60)||0),defaultActionSec:Math.max(0,Number(cfg?.timing?.defaultActionSec??30)||0),artifactActionSec:Math.max(0,Number(cfg?.timing?.artifactActionSec??30)||0),autoAdvance:cfg?.timing?.autoAdvance!==false};playSceneState.artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number(cfg?.artifactLimitPerCycle??3)||0)));savePlayScene();
    const name=document.getElementById('playGameName');if(name)name.value=playSceneState.gameName;const v=document.getElementById('playVillageDiscussionSec'),w=document.getElementById('playWolfDiscussionSec'),d=document.getElementById('playDefaultActionSec'),a=document.getElementById('playAutoAdvance');if(v)v.value=playSceneState.gameTiming.villageDiscussionSec;if(w)w.value=playSceneState.gameTiming.wolfDiscussionSec;if(d)d.value=playSceneState.gameTiming.defaultActionSec;const artifactSec=document.getElementById('playArtifactActionSec');if(artifactSec)artifactSec.value=playSceneState.gameTiming.artifactActionSec;if(a)a.checked=playSceneState.gameTiming.autoAdvance;const quota=document.getElementById('playArtifactLimitPerCycle');if(quota)quota.value=String(playSceneState.artifactLimitPerCycle);
    updatePlayArtifactToggle();await renderPlayGameRoles();renderPlayGameRoleTimings();updatePlayGameRoleCount();
  }catch(err){playFlashError(err.message)}
}
async function openPlayGameSheet(){
  if(!isLivePlayRoom()){await playCreateRoom();return}if(!playLiveMembers().length){setPlayStep('members');if(playSceneState.roomMode==='offline')openPlayRosterSheet();return}
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');if(!sheet||!card)return;card.dataset.mode='play';
  const title=card.querySelector('.sheet-head h3');if(title)title.textContent='Chọn Ván Mẫu';const roomLabel=document.getElementById('playGameRoomLabel');if(roomLabel)roomLabel.textContent='Phòng '+playSceneState.roomCode+' • '+playLiveMembers().length+' Người Chơi';const save=document.getElementById('playGameSave');if(save)save.textContent='CHỌN VÁN';const del=document.getElementById('playGameDelete');if(del)del.hidden=true;
  sheet.classList.remove('hidden');await loadPlayGameTemplates();const sel=document.getElementById('playGameTemplateSelect');if(sel){sel.onchange=e=>applyPlayGameTemplate(e.target.value);if(!sel.value&&playSceneRuntime.gameTemplates[0]){sel.value=String(playSceneRuntime.gameTemplates[0].id);await applyPlayGameTemplate(sel.value)}}renderPlayGameRoleTimings();updatePlayArtifactToggle();updatePlayGameRoleCount();
}
async function openLibraryGameTemplate(id=''){
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');if(!sheet||!card)return;card.dataset.mode='library';const title=card.querySelector('.sheet-head h3');if(title)title.textContent='Thiết kế Ván Mẫu';const label=document.getElementById('playGameRoomLabel');if(label)label.textContent='Thư Viện • lưu trước khi vào Phòng';const save=document.getElementById('playGameSave');if(save)save.textContent='LƯU';const del=document.getElementById('playGameDelete');if(del)del.hidden=!id;
  if(!id){playSceneState.gameTemplateId='';playSceneState.gameName='Ván GMWW';playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};playSceneState.artifactsEnabled=playFavoriteArtifacts().length>0;playSceneState.artifactIds=playFavoriteArtifacts().map(a=>String(a.id));playSceneState.artifactLimitPerCycle=3;playSceneState.gameTiming={villageDiscussionSec:300,wolfDiscussionSec:60,defaultActionSec:30,artifactActionSec:30,autoAdvance:true};const v=document.getElementById('playVillageDiscussionSec'),w=document.getElementById('playWolfDiscussionSec'),d=document.getElementById('playDefaultActionSec'),a=document.getElementById('playAutoAdvance'),quota=document.getElementById('playArtifactLimitPerCycle');if(v)v.value=300;if(w)w.value=60;if(d)d.value=30;const artifactSec=document.getElementById('playArtifactActionSec');if(artifactSec)artifactSec.value=30;if(a)a.checked=true;if(quota)quota.value=3}
  sheet.classList.remove('hidden');await loadPlayGameTemplates();const sel=document.getElementById('playGameTemplateSelect');if(sel){sel.onchange=e=>{const v=e.target.value;if(v)applyPlayGameTemplate(v);else openLibraryGameTemplate('')};sel.value=id||''}if(id){await applyPlayGameTemplate(id);const del=document.getElementById('playGameDelete');if(del)del.hidden=false}else{document.getElementById('playGameName').value='Ván GMWW';await renderPlayGameRoles();updatePlayGameRoleCount()}
}
function closePlayGameSheet(){document.getElementById('playGameSheet')?.classList.add('hidden')}
function suggestPlayGameRoles(){
  const mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play',need=mode==='library'?Math.max(1,playRolePlanTotal()||12):playLiveMembers().length,roles=playSortedRoles();playSceneState.rolePlan={};for(let i=0;i<need&&i<roles.length;i++)playSceneState.rolePlan[roles[i].id]=(playSceneState.rolePlan[roles[i].id]||0)+1;savePlayScene();renderPlayGameRoles();updatePlayGameRoleCount();
}
async function savePlayGame(){
  const card=document.querySelector('.play-game-sheet-card'),mode=card?.dataset.mode||'play',clamp=x=>Math.max(0,Math.min(3600,Number(x)||0));
  if(mode==='play'){
    const id=String(document.getElementById('playGameTemplateSelect')?.value||'');
    if(!id){playFlashError('Hãy chọn Ván Mẫu đã lưu trong Thư Viện.');return}
    const need=playLiveMembers().length,total=playRolePlanTotal();
    if(total!==need){playFlashError('Ván Mẫu có '+total+' lá, nhưng phòng có '+need+' người. Hãy chọn Ván Mẫu phù hợp.');return}
    if(playSceneState.artifactsEnabled&&!playTemplateSelectedArtifacts().length){playFlashError('Hãy chọn ít nhất một Artifact hoặc tắt Artifact.');return}
    const timing={
      villageDiscussionSec:clamp(document.getElementById('playVillageDiscussionSec')?.value),
      wolfDiscussionSec:clamp(document.getElementById('playWolfDiscussionSec')?.value),
      defaultActionSec:clamp(document.getElementById('playDefaultActionSec')?.value),
      artifactActionSec:clamp(document.getElementById('playArtifactActionSec')?.value),
      autoAdvance:!!document.getElementById('playAutoAdvance')?.checked
    };
    playSceneState.gameTiming=timing;
    playSetBusy(true);
    try{
      const template=await gmApi('/api/gm/game-templates/'+encodeURIComponent(id));
      const base=template?.template?.compiledConfig||template?.template?.gameConfig;
      if(!base)throw new Error('Không tải được Ván Mẫu.');
      await playEnsureTemplateAssets(id,base);
      const selectedArtifacts=playSceneState.artifactsEnabled?playTemplateSelectedArtifacts():[];
      const configured={
        ...base,
        roles:(base.roles||[]).map(r=>({...r,actionDurationSec:playRoleDurationSec(r.roleId,timing.defaultActionSec)})),
        timing,
        artifactLimitPerCycle:Math.max(0,Math.min(30,Math.trunc(Number(document.getElementById('playArtifactLimitPerCycle')?.value??3)||0))),
        artifacts:selectedArtifacts.map((a,i)=>({artifactId:String(a.id),order:i+1}))
      };
      const matchId='match-'+Date.now().toString(36);
      const data=await playRoomApi('/config',{method:'POST',body:JSON.stringify({
        gameConfig:configured,matchId,matchRevision:Number(playSceneRuntime.room?.matchRevision||0)+1
      })});
      playSceneRuntime.gameConfig=data.gameConfig||configured;
      playSceneRuntime.room=data.room||playSceneRuntime.room;
      const templateAssets=playTemplateAssetIds(base);
      for(let offset=0;offset<templateAssets.length;offset+=3){
        const prepared=await playRoomApi('/template-assets',{method:'POST',body:JSON.stringify({templateId:id,assetIds:templateAssets.slice(offset,offset+3)})});
        if(prepared?.ready!==true)throw new Error('Artwork Ván Mẫu chưa nạp xong, chưa thể Phân Vai.');
      }
      await playPreloadSelectedArtwork(configured);
      playSceneState.gameTemplateId=id;
      playSceneState.gameName=configured.name||'Ván GMWW';
      playSceneState.matchId=matchId;
      playSceneState.assignmentsPreview=[];
      playSceneState.step='roles';
      savePlayScene();void playPublishStage('roles');closePlayGameSheet();renderPlayScene();
    }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
    return;
  }
  const total=playRolePlanTotal();if(total<1){playFlashError('Ván Mẫu phải có ít nhất một Lá Bài được chọn.');return}
  const roles=playSortedRoles().filter(r=>Number(playSceneState.rolePlan?.[r.id])>0);
  const chosen=roles.map((r,i)=>({roleId:r.id,roleName:r.name,faction:playFactionLabel(r),
    description:r.information||'',count:Math.max(1,Number(playSceneState.rolePlan[r.id])||1),
    order:Math.max(1,Number(playSceneState.roleOrders?.[r.id])||i+1),
    actionDurationSec:playRoleDurationSec(r.id,playSceneState.gameTiming?.defaultActionSec??30)})).sort((a,b)=>a.order-b.order);
  const gameName=(document.getElementById('playGameName')?.value.trim()||'Ván GMWW').slice(0,48),
    templateId=playSceneState.gameTemplateId||('template-'+Date.now().toString(36));
  if(total>30){playFlashError('Ván Mẫu tối đa 30 người. Hãy giảm số lượng lá.');return}
  const timing={villageDiscussionSec:clamp(document.getElementById('playVillageDiscussionSec')?.value??300),wolfDiscussionSec:clamp(document.getElementById('playWolfDiscussionSec')?.value??60),defaultActionSec:clamp(document.getElementById('playDefaultActionSec')?.value??30),artifactActionSec:clamp(document.getElementById('playArtifactActionSec')?.value??30),autoAdvance:!!document.getElementById('playAutoAdvance')?.checked};
  const artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number(document.getElementById('playArtifactLimitPerCycle')?.value??3)||0)));
  const selectedArtifacts=playSceneState.artifactsEnabled?playTemplateSelectedArtifacts():[];
  const cfg={id:templateId,name:gameName,playerCount:total,roles:chosen.map(r=>({...r,actionDurationSec:playRoleDurationSec(r.roleId,timing.defaultActionSec)})),artifacts:selectedArtifacts.map((a,i)=>({artifactId:String(a.id),order:i+1})),timing,artifactLimitPerCycle};
  playSceneState.gameTiming=timing;playSceneState.artifactLimitPerCycle=artifactLimitPerCycle;
  playSetBusy(true);try{const cached=await gmApi('/api/gm/game-templates',{method:'PUT',body:JSON.stringify({id:templateId,gameConfig:cfg})});await playEnsureTemplateAssets(String(cached?.template?.id||templateId),cached?.template?.compiledConfig||cfg);playSceneState.gameTemplateId=String(cached?.template?.id||templateId);playSceneState.gameName=gameName;savePlayScene();closePlayGameSheet();await loadPlayGameTemplates();renderGameTemplateLibrary()}catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
function playRandomInt(max){if(max<=1)return 0;if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1),limit=Math.floor(0x100000000/max)*max;let n;do{crypto.getRandomValues(a);n=a[0]}while(n>=limit);return n%max}return Math.floor(Math.random()*max)}
function playShuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=playRandomInt(i+1),t=a[i];a[i]=a[j];a[j]=t}return a}
function playAssignArtifactsToRows(rows,{preserve=false}={}){
  if(!playSceneState.artifactsEnabled)return rows.map(r=>({...r,artifactId:'',artifactName:''}));
  const pool=playTemplateSelectedArtifacts();if(!pool.length)throw new Error('Chưa chọn Artifact nào cho trận này.');
  const old=new Map((playSceneState.assignmentsPreview||[]).map(r=>[String(r.loginId),r])),shuffled=playShuffle(pool);
  return rows.map((r,i)=>{
    const keep=preserve?old.get(String(r.loginId)):null,artifact=keep?.artifactId?(state.artifacts||[]).find(a=>String(a.id)===String(keep.artifactId)):(shuffled[i%shuffled.length]||pool[i%pool.length]);
    return {...r,artifactId:artifact?.id||'',artifactName:artifact?.name||''};
  });
}
function playBuildAssignments(opts={}){
  const members=playLiveMembers(),rolesById=new Map((state.cards||[]).map(r=>[String(r.id),r])),deck=[];
  for(const [roleId,countRaw] of Object.entries(playSceneState.rolePlan||{})){const role=rolesById.get(String(roleId)),count=Math.max(0,Number(countRaw)||0);if(!role)continue;for(let i=0;i<count;i++)deck.push(role)}
  if(deck.length!==members.length)throw new Error('Số Vai Trò không khớp số Thành Viên. Hãy quay lại Chọn Ván.');
  const shuffled=opts.random===false?deck:playShuffle(deck),baseRows=members.map((m,i)=>({loginId:m.loginId,displayName:m.displayName,roleId:shuffled[i].id,roleName:shuffled[i].name,faction:playFactionLabel(shuffled[i]),description:shuffled[i].information||''})),rows=playAssignArtifactsToRows(baseRows,{preserve:opts.preserveArtifacts===true});
  playSceneState.assignmentsPreview=rows;playSceneState.step='deal';void playPublishStage('deal');if(rows[0]){playSceneState.activePlayerId=rows[0].loginId;playSceneState.roleId=rows[0].roleId;playSceneState.artifactId=rows[0].artifactId||''}savePlayScene();renderPlayScene();return rows;
}
function playRerollArtifacts(){
  if(!playSceneState.artifactsEnabled){playFlashError('Artifact đang tắt trong Ván này.');return}
  const rows=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[];if(!rows.length)return;
  playSceneState.assignmentsPreview=playAssignArtifactsToRows(rows,{preserve:false});const active=playSceneState.assignmentsPreview.find(r=>String(r.loginId)===String(playSceneState.activePlayerId));playSceneState.artifactId=active?.artifactId||'';savePlayScene();renderPlayScene();
}
function playCycleActiveArtifact(){
  if(!playSceneState.artifactsEnabled){playFlashError('Artifact đang tắt trong Ván này.');return}
  const pool=playFavoriteArtifacts(),rows=playSceneState.assignmentsPreview||[],idx=rows.findIndex(r=>String(r.loginId)===String(playSceneState.activePlayerId));if(idx<0||!pool.length){playFlashError('Hãy chọn Người Chơi trước.');return}
  const current=String(rows[idx].artifactId||''),p=Math.max(-1,pool.findIndex(a=>String(a.id)===current)),next=pool[(p+1)%pool.length];rows[idx]={...rows[idx],artifactId:next.id,artifactName:next.name};playSceneState.assignmentsPreview=rows;playSceneState.artifactId=next.id;savePlayScene();renderPlayScene();
}
function playRoleCardPayload(role){
  const actions=(role.functions||[]).map(fn=>{const act=(state.actions?.role||[]).find(a=>a.id===fn.actionId);return{id:String(fn.actionId||act?.id||''),name:String(act?.name||fn.description||'Hành Động'),description:String(act?.description||fn.description||''),limits:role.limits||null}});
  return{version:7,name:role.name||'Vai Trò',faction:playFactionLabel(role),information:role.information||'',objective:role.winCondition||'',actions,limits:role.limits||null,artworkAssetId:'role:'+role.id,artworkId:'role:'+role.id};
}
function playArtifactCardPayload(artifact){
  const actions=(artifact?.functions||[]).map(fn=>{const act=(state.actions?.artifacts||[]).find(a=>a.id===fn.actionId);return{id:String(fn.actionId||act?.id||''),name:String(act?.name||fn.description||'Hành Động'),description:String(act?.description||fn.description||''),limits:artifact?.limits||null}});
  return{version:1,name:artifact?.name||'Artifact',information:artifact?.information||'',actions,limits:artifact?.limits||null,singleUse:artifact?.singleUse===true||artifact?.artifact?.singleUse===true,artworkAssetId:'artifact:'+artifact?.id,artworkId:'artifact:'+artifact?.id};
}

async function playBlobDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Không đọc được Artwork'));r.readAsDataURL(blob)})}
async function playVerifiedArtworkData(kind,id){
  // Player uses the same DISPLAY artwork as the GM library (not a cropped thumbnail).
  // Decode first: an HTTP 200 response with invalid bytes is not a valid card.
  let src=await resolveArtwork(kind,id,'display');
  if(!src||String(src).includes('default-artwork.webp'))src=await resolveArtwork(kind,id,'full');
  if(!src||String(src).includes('default-artwork.webp'))throw new Error('Artwork '+id+' chưa có ảnh thật. Hãy cập nhật trong Bộ Bài.');
  const response=await fetch(src,{cache:'no-store'});
  if(!response.ok)throw new Error('Không tải được artwork '+id+' (HTTP '+response.status+').');
  let blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw new Error('Artwork '+id+' không phải hình ảnh.');
  let bitmap=null;
  try{
    bitmap=await createImageBitmap(blob);
    if(!bitmap.width||!bitmap.height)throw new Error('Hình không có kích thước');
    const maxBytes=1300000;
    if(blob.size>maxBytes||blob.type==='image/svg+xml'){
      const scale=Math.min(1,1800/bitmap.width,1800/bitmap.height);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không thể tối ưu ảnh');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      let reduced=null;
      for(const quality of [0.88,0.80,0.72,0.63]){
        reduced=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
        if(reduced?.type==='image/webp'&&reduced.size<=maxBytes)break;
      }
      if(!reduced||reduced.size>maxBytes)throw new Error('Ảnh quá lớn để đóng gói');
      blob=reduced;
    }
  }catch(err){throw new Error('Artwork '+id+' không thể kiểm tra/đóng gói: '+String(err?.message||err))}
  finally{bitmap?.close?.()}
  const data=await playBlobDataUrl(blob);
  if(!/^data:image\/(?:webp|png|jpeg);base64,/i.test(data)||data.length>=1900000)throw new Error('Artwork '+id+' không đạt giới hạn gói dữ liệu.');
  return data;
}
async function playRoleArtworkData(role){return playVerifiedArtworkData('cards',role.id)}
async function playArtifactArtworkData(artifact){return playVerifiedArtworkData('artifacts',artifact.id)}
function playTemplateAssetIds(cfg){
  return [...new Set([...(cfg?.roles||[]).map(r=>'role:'+String(r.roleId||'')),...(cfg?.artifacts||[]).map(a=>'artifact:'+String(a.artifactId||''))].filter(x=>!x.endsWith(':')))];
}
async function playEnsureTemplateAssets(id,cfg){
  const endpoint='/api/gm/game-templates/'+encodeURIComponent(id)+'/assets';
  let status=await gmApi(endpoint+'/status');
  if(status?.ready)return status;
  const missing=new Set(status?.missing||playTemplateAssetIds(cfg));
  for(const assetId of missing){
    const isArtifact=assetId.startsWith('artifact:'),rawId=assetId.slice(isArtifact?9:5);
    const model=((isArtifact?state.artifacts:state.cards)||[]).find(x=>String(x.id)===rawId);
    if(!model)throw new Error('Thiếu Lá Bài '+assetId+' trong Thư Viện. Không thể đóng gói Ván Mẫu.');
    const imageDataUrl=isArtifact?await playArtifactArtworkData(model):await playRoleArtworkData(model);
    const pkg=isArtifact?{roleId:assetId,roleName:model.name,artworkAssetId:assetId,roleCard:playArtifactCardPayload(model)}:
      {roleId:rawId,roleName:model.name,faction:playFactionLabel(model),description:model.information||'',artworkAssetId:assetId,roleCard:playRoleCardPayload(model)};
    const uploaded=await gmApi(endpoint,{method:'PUT',body:JSON.stringify({assetId,imageDataUrl,package:pkg})});
    if(uploaded?.ok!==true||uploaded?.hasImage!==true)throw new Error('Không xác nhận được ảnh '+model.name+'.');
  }
  status=await gmApi(endpoint+'/status');
  if(!status?.ready)throw new Error('Ván Mẫu chưa đóng gói đủ ảnh: '+(status?.missing||[]).join(', '));
  return status;
}
async function playPreloadSelectedArtwork(cfg){
  const expected=playTemplateAssetIds(cfg);
  const manifest=await playRoomApi('/artwork-manifest',{method:'GET'});
  const existing=new Set(manifest?.assetIds||[]);
  for(const assetId of expected.filter(x=>!existing.has(x))){
    const isArtifact=assetId.startsWith('artifact:'),id=assetId.slice(isArtifact?9:5),model=((isArtifact?state.artifacts:state.cards)||[]).find(x=>String(x.id)===id);
    if(!model)throw new Error('Không tìm thấy Artwork '+assetId+' cho trận này.');
    const imageDataUrl=await(isArtifact?playArtifactArtworkData(model):playRoleArtworkData(model));
    const roleCard=isArtifact?playArtifactCardPayload(model):playRoleCardPayload(model);
    const body={roles:[{roleId:isArtifact?assetId:id,roleName:model.name,artworkAssetId:assetId,roleCard,imageDataUrl}]};
    const uploaded=await playRoomApi('/role-assets',{method:'POST',body:JSON.stringify(body)});
    if(uploaded?.roles?.[0]?.hasImage!==true)throw new Error('Không nạp được ảnh '+model.name+' lên Phòng.');
  }
  const verified=await playRoomApi('/artwork-manifest',{method:'GET'});
  if(!expected.every(id=>verified?.assetIds?.includes(id)))throw new Error('Chưa nạp đầy đủ artwork vào Phòng. Phân Vai đang được giữ lại.');
  return verified;
}
async function playDealRoles(){
  const rows=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[];if(!rows.length){playBuildAssignments();return}
  const uniqueIds=[...new Set(rows.map(r=>String(r.roleId)))],roles=uniqueIds.map(id=>(state.cards||[]).find(r=>String(r.id)===id)).filter(Boolean),artifactIds=[...new Set(rows.map(r=>String(r.artifactId||'')).filter(Boolean))],artifacts=artifactIds.map(id=>(state.artifacts||[]).find(a=>String(a.id)===id)).filter(Boolean);playSetBusy(true);
  try{
    const expected=playTemplateAssetIds({roles:roles.map(r=>({roleId:r.id})),artifacts:artifacts.map(a=>({artifactId:a.id}))});
    const manifest=await playRoomApi('/artwork-manifest',{method:'GET'});
    if(!expected.every(id=>manifest?.assetIds?.includes(id)))throw new Error('Artwork chưa sẵn sàng. Vui lòng chọn lại Ván Mẫu để nạp đầy đủ trước khi Phát Vai.');
    const packages=roles.map(role=>({roleId:role.id,roleName:role.name,roleCard:playRoleCardPayload(role)}));
    const pkgById=new Map(packages.map(p=>[String(p.roleId),p]));
    const artifactById=new Map(artifacts.map(a=>[String(a.id),a]));
    const assignments=rows.map(r=>{
      const p=pkgById.get(String(r.roleId))||{},role=(state.cards||[]).find(x=>String(x.id)===String(r.roleId)),artifact=artifactById.get(String(r.artifactId||''))||null;
      const artifactPayload=artifact?{artifactId:String(artifact.id),artifactName:artifact.name,artworkAssetId:'artifact:'+artifact.id,artifactCard:playArtifactCardPayload(artifact)}:null;
      return{loginId:r.loginId,roleId:r.roleId,roleName:r.roleName,faction:r.faction,description:r.description,artworkAssetId:'role:'+r.roleId,roleCard:p.roleCard||playRoleCardPayload(role||r),...(artifactPayload?{artifact:artifactPayload}:{})};
    });
    const data=await playRoomApi('/assignments',{method:'POST',body:JSON.stringify({assignments,multiAssign:false,matchId:playSceneState.matchId||('match-'+Date.now().toString(36)),matchRevision:Number(playSceneRuntime.room?.matchRevision||1),deliveryVersion:Number(playSceneRuntime.room?.deliveryVersion||0)+1})});
    playSceneRuntime.assignments=Array.isArray(data.assignments)?data.assignments:assignments;playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneState.step='battle';savePlayScene();void playPublishStage('battle');await playSyncRoom(true);renderPlayScene();
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}

function selectPlayWinner(faction){
  const value=String(faction||'');playSceneRuntime.selectedWinnerFaction=value;
  document.querySelectorAll('[data-play-winner]').forEach(b=>b.classList.toggle('selected',b.dataset.playWinner===value));
  const confirm=document.getElementById('playEndConfirm');if(confirm)confirm.disabled=!value||playSceneRuntime.busy;
}
function selectedPlayPlayer(){return playLiveMembers().find(p=>String(p?.loginId||'')===String(playSceneState.activePlayerId||''))||null}
let playSeatAssignTarget=0,playSeatCandidateMode='online',playSeatManualOpen=false;
function playSeatCandidateRows(mode=playSeatCandidateMode){
  const seated=new Set(playLiveMembers().filter(p=>Number(p?.seatId||0)>0).map(p=>String(p.loginId||'')));
  return (memberAdminState.members||[]).filter(m=>{
    const id=String(m?.loginId||'');if(!id||seated.has(id))return false;
    if(mode==='offline')return m?.online!==true;
    if(m?.online!==true)return false;
    const other=String(m?.currentRoomCode||'');return !other||other===String(playSceneState.roomCode||'')
  })
}
async function ensureSeatCandidateInRoom(loginId){
  loginId=String(loginId||'');let member=playLiveMembers().find(p=>String(p?.loginId||'')===loginId);if(member)return member;
  const source=memberAdminState.members||[],ids=[...new Set([...playLiveMembers().map(p=>String(p.loginId||'')),loginId])],existing=new Map(playLiveMembers().map(p=>[String(p.loginId),p]));
  const chosen=source.filter(m=>ids.includes(String(m.loginId))).map(m=>({loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:m.gameCharacterId||existing.get(String(m.loginId))?.gameCharacterId||null,seatId:existing.get(String(m.loginId))?.seatId||null}));
  const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:chosen,replace:true})});
  playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.selectedMemberIds=ids;savePlayScene();
  return playLiveMembers().find(p=>String(p?.loginId||'')===loginId)||null
}
async function assignSeatCandidate(loginId){
  if(!playSeatAssignTarget||playSceneRuntime.busy)return;playSetBusy(true);
  try{
    const member=await ensureSeatCandidateInRoom(loginId);if(!member)throw new Error('Không thêm được Thành Viên vào Phòng.');
    const data=await playRoomApi('/seat',{method:'POST',body:JSON.stringify({participantId:member.participantId||('member:'+member.loginId),seatId:playSeatAssignTarget})});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.activePlayerId=String(member.loginId||'');savePlayScene();closePlaySeatSheet();renderPlayScene()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function openPlaySeatAssignSheet(seatId){
  playSeatManualOpen=false;playSeatAssignTarget=Math.max(1,Number(seatId)||0);playSeatCandidateMode='online';
  try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}
  renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')
}
function renderPlaySeatSheet(){
  const grid=document.getElementById('playSeatGrid'),label=document.getElementById('playSeatPlayerLabel'),summary=document.getElementById('playSeatSummary'),selected=selectedPlayPlayer(),stats=playSeatStats(),tabs=document.getElementById('playSeatMemberTabs'),manual=document.getElementById('playSeatManualMembers'),sheet=document.getElementById('playSeatSheet');if(!grid)return;
  sheet?.classList.toggle('is-manual',playSeatManualOpen&&!playSeatAssignTarget);
  grid.innerHTML='';
  if(manual){manual.innerHTML='';if(playSeatManualOpen&&!playSeatAssignTarget){
    for(const p of playLiveMembers()){
      const lid=String(p?.loginId||''),b=document.createElement('button');b.type='button';b.className='play-seat-manual-member'+(selected&&String(selected.loginId)===lid?' is-selected':'');
      b.innerHTML='<b>'+playEsc(p.displayName||lid)+'</b><small>'+(Number(p.seatId||0)?'Vị trí '+Number(p.seatId):'CHƯA XẾP')+'</small>';
      b.onclick=()=>{playSceneState.activePlayerId=lid;savePlayScene();renderPlaySeatSheet();renderPlayPlayers()};manual.appendChild(b)
    }
    if(!manual.children.length)manual.innerHTML='<div class="member-empty">Chưa có người chơi. Hãy GỌI NGƯỜI trước.</div>';
  }}
  if(playSeatAssignTarget){
    if(label)label.textContent='Vị trí '+playSeatAssignTarget+' • Chọn Thành Viên';
    const rows=playSeatCandidateRows();if(summary)summary.textContent=(playSeatCandidateMode==='online'?'Đang Online':'Tài khoản Offline')+' • '+rows.length+' có thể chọn';
    tabs?.classList.remove('hidden');tabs?.querySelectorAll('[data-play-seat-member-mode]').forEach(b=>b.classList.toggle('active',b.dataset.playSeatMemberMode===playSeatCandidateMode));
    for(const m of rows){
      const b=document.createElement('button'),initial=(String(m.displayName||m.loginId||'?').trim().charAt(0)||'?').toUpperCase();b.type='button';b.className='play-seat-member-choice';
      b.innerHTML='<img alt=""><div><b>'+playEsc(m.displayName||m.loginId)+'</b><small>'+playEsc(m.loginId)+' • '+(m.online?'ONLINE':'OFFLINE')+'</small></div><span>›</span>';
      const img=b.querySelector('img'),src=playCharacterUrl(m.gameCharacterId);img.src=src||memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{const s=document.createElement('i');s.textContent=initial;img.replaceWith(s)};
      b.onclick=()=>assignSeatCandidate(m.loginId);grid.appendChild(b)
    }
    if(!rows.length)grid.innerHTML='<div class="member-empty">Không có Thành Viên phù hợp.</div>';
    const release=document.getElementById('playSeatRelease');if(release)release.classList.add('hidden');return
  }
  tabs?.classList.add('hidden');if(label)label.textContent=selected?(selected.displayName+' • '+(selected.seatId?'Vị trí '+selected.seatId:'Chưa có vị trí')):'Chọn Người Chơi trên Làng';if(summary)summary.textContent=stats.occupied+'/'+stats.seatCount+' vị trí có người • '+stats.available+' vị trí trống';
  const bySeat=new Map(playLiveMembers().map(p=>[Number(p?.seatId||0),p]));
  for(let seatId=1;seatId<=stats.seatCount;seatId++){
    const occupant=bySeat.get(seatId)||null,b=document.createElement('button');b.type='button';b.className='play-seat-choice'+(occupant?' occupied':'')+(selected&&Number(selected.seatId)===seatId?' current':'');b.innerHTML='<b>VỊ TRÍ '+seatId+'</b><small>'+playEsc(occupant?.displayName||'TRỐNG')+'</small>';b.onclick=()=>moveSelectedPlayerToSeat(seatId,occupant);grid.appendChild(b)
  }
  const release=document.getElementById('playSeatRelease');if(release){release.classList.remove('hidden');release.disabled=!selected?.seatId}
}
async function openPlaySeatSheet(){playSeatManualOpen=false;playSeatAssignTarget=0;if(!selectedPlayPlayer()){playFlashError('Hãy chạm vào một Người Chơi trên Làng trước.');return}renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')}
function openPlaySeatManualSheet(){playSeatAssignTarget=0;playSeatManualOpen=true;renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')}
function closePlaySeatSheet(){playSeatManualOpen=false;playSeatAssignTarget=0;document.getElementById('playSeatSheet')?.classList.remove('is-manual');document.getElementById('playSeatSheet')?.classList.add('hidden')}
async function updateSelectedPlayerSeat(payload){
  const selected=selectedPlayPlayer();if(!selected)return;playSetBusy(true);
  try{const data=await playRoomApi('/seat',{method:'POST',body:JSON.stringify({participantId:selected.participantId||('member:'+selected.loginId),...payload})});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;savePlayScene();renderPlayScene();renderPlaySeatSheet()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function moveSelectedPlayerToSeat(seatId,occupant){
  const selected=selectedPlayPlayer();if(!selected){playFlashError('Chọn người chơi ở cột DANH SÁCH trước khi chọn vị trí.');return}if(String(occupant?.participantId||'')===String(selected.participantId||''))return;
  if(occupant&&!confirm('Vị trí '+seatId+' đang có '+occupant.displayName+'. Đổi chỗ hai người?'))return;
  await updateSelectedPlayerSeat({seatId,swap:!!occupant})
}
async function releaseSelectedPlayerSeat(){const selected=selectedPlayPlayer();if(!selected?.seatId)return;if(!confirm('Giải phóng Seat '+selected.seatId+' của '+selected.displayName+'?'))return;await updateSelectedPlayerSeat({seatId:null})}
async function playCallOnlineMembers(){
  if(!isLivePlayRoom()||playSceneRuntime.busy)return;
  playSetBusy(true);
  try{
    await playLoadFreshRosterMembers();
    const existing=playLiveMembers(),byId=new Map(existing.map(m=>[String(m.loginId),m]));
    const online=(memberAdminState.members||[]).filter(m=>m?.online===true&&(!m.currentRoomCode||String(m.currentRoomCode)===String(playSceneState.roomCode)));
    const ids=new Set([...byId.keys(),...online.map(m=>String(m.loginId))]);
    if(ids.size>30)throw new Error('Phòng hỗ trợ tối đa 30 thành viên.');
    const source=new Map((memberAdminState.members||[]).map(m=>[String(m.loginId),m]));
    const chosen=[...ids].map(id=>{const m=source.get(id)||byId.get(id);return {loginId:id,displayName:m?.displayName||id,avatarId:m?.avatarId,gameCharacterId:m?.gameCharacterId||byId.get(id)?.gameCharacterId||null,seatId:byId.get(id)?.seatId||null}});
    if(!chosen.length){playFlashError('Chưa có thành viên online trong sảnh chờ.');return}
    const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:chosen,replace:true})});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;
    playSceneState.selectedMemberIds=[...ids];savePlayScene();renderPlayScene();
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playRandomSeatRemaining(){
  if(!isLivePlayRoom())return;const remaining=playLiveMembers().filter(m=>!Number(m?.seatId||0));if(!remaining.length){playFlashError('Tất cả Người Chơi đã có vị trí.');return}
  playSetBusy(true);
  try{
    const data=await playRoomApi('/seats/randomize-remaining',{method:'POST',body:'{}'});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;savePlayScene();renderPlayScene()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playSetSeatLock(locked=true){
  if(!isLivePlayRoom())return false;
  try{const data=await playRoomApi('/seat-lock',{method:'POST',body:JSON.stringify({locked:locked!==false})});playSceneRuntime.room=data.room||playSceneRuntime.room;renderPlayScene();return !!data.seatsLocked}catch(err){playFlashError(err.message);return false}
}
async function playFinishSeating(){
  const members=playLiveMembers(),missing=members.filter(m=>!Number(m?.seatId||0));if(missing.length){playFlashError('Còn '+missing.length+' Người Chơi chưa có vị trí. Dùng “Phân vị trí còn lại” hoặc chọn từng người.');return}
  const locked=await playSetSeatLock(true);if(locked){playSceneState.step='game';playSceneState.activePlayerId='';savePlayScene();renderPlayScene();void playPublishStage('game')}
}
async function openPlayEndSheet(){
  // Forced end is available during room setup, seating, role delivery, day or night.
  if(!isLivePlayRoom()){playFlashError('Chưa chọn Phòng để kết thúc ván.');return}
  if(!playSceneRuntime.room)await playSyncRoom(true);
  if(!isLivePlayRoom())return;
  const sheet=document.getElementById('playEndSheet');if(!sheet)return;
  const label=document.getElementById('playEndRoomLabel');
  if(label)label.textContent='Phòng '+playSceneState.roomCode+' • '+(playSceneRuntime.room?.roomName||'GMWW');
  const btn=document.getElementById('playEndConfirm');if(btn)btn.disabled=!!playSceneRuntime.busy;
  sheet.classList.remove('hidden');
}
function closePlayEndSheet(){document.getElementById('playEndSheet')?.classList.add('hidden')}
async function confirmPlayEndGame(){
  if(playSceneRuntime.busy)return;
  if(!isLivePlayRoom()){playFlashError('Chưa chọn Phòng để kết thúc ván.');return}
  playSetBusy(true);const btn=document.getElementById('playEndConfirm');if(btn)btn.disabled=true;
  try{
    // Reuse the server's authenticated hard reset. This does not record a winner.
    const resetVersion=Number(playSceneRuntime.room?.resetVersion||0);
    const data=await playRoomApi('/reset',{method:'POST',body:JSON.stringify({
      transactionId:'forced-end-'+Date.now(),expectedResetVersion:resetVersion,
      forceEnd:true,postGame:false,preserveParticipants:false
    })});
    if(data?.hardReset!==true||Number(data?.playersCount||0)!==0)throw new Error('Server chưa xác nhận kết thúc cưỡng ép và giải phóng toàn bộ người chơi.');
    playSceneRuntime.room=data.room||null;
    playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;
    playSceneRuntime.nightRuntime=null;playSceneRuntime.winProposal=null;
    playSceneRuntime.activeEffects=[];playSceneRuntime.artifactCycle={count:0,max:3};
    playSceneRuntime.selectedWinnerFaction='';
    playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;
    disconnectPlaySocket();playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;
    playSceneState.artifactCount=0;playSceneState.assignmentsPreview=[];
    playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';
    playSceneState.roleId='';playSceneState.artifactId='';
    playSceneState.matchId='';playSceneState.gameName='Ván GMWW';
    playSceneState.gameTemplateId='';playSceneState.rolePlan={};
    playSceneState.roleDurations={};playSceneState.artifactsEnabled=false;
    savePlayScene();closePlayEndSheet();
    renderPlayScene();gmwwSendGmPresence(true);
    playFlashError('Đã kết thúc ván. Trở về Sảnh chờ (bước 1).');
  }catch(err){playFlashError(err.message||'Không thể kết thúc cưỡng ép.')}
  finally{playSetBusy(false);if(btn)btn.disabled=false}
}
function playRosterSelectedIds(){return [...document.querySelectorAll('#playRosterList .play-roster-row.selected')].map(x=>String(x.dataset.loginId||'')).filter(Boolean)}
function updatePlayRosterCount(){const count=playRosterSelectedIds().length,el=document.getElementById('playRosterCount');if(el)el.textContent=count+' đã chọn'}
let playRosterFilterMode='all';
function applyPlayRosterFilter(){
  const list=document.getElementById('playRosterList');if(!list)return;
  document.querySelectorAll('#playRosterFilters [data-play-roster-filter]').forEach(btn=>{
    const active=btn.dataset.playRosterFilter===playRosterFilterMode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
  const rows=[...list.querySelectorAll('.play-roster-row')];let visible=0;
  rows.forEach(row=>{
    const show=playRosterFilterMode==='all'||row.dataset.presence===playRosterFilterMode;
    row.classList.toggle('hidden',!show);
    if(show)visible++;
  });
  let empty=document.getElementById('playRosterFilterEmpty');
  if(rows.length&&!empty){
    empty=document.createElement('div');empty.id='playRosterFilterEmpty';empty.className='member-empty';
    list.appendChild(empty);
  }
  if(empty){
    empty.textContent=playRosterFilterMode==='online'?'Không có Thành Viên Online.':playRosterFilterMode==='offline'?'Không có Thành Viên Offline.':'Chưa có Thành Viên trong danh bạ.';
    empty.classList.toggle('hidden',visible>0);
  }
}
function setPlayRosterFilter(mode){
  playRosterFilterMode=mode==='online'||mode==='offline'?mode:'all';
  applyPlayRosterFilter();
}
async function playLoadFreshRosterMembers(){
  const data=await gmApi('/api/gm/members');
  if(!Array.isArray(data?.members))throw new Error('Không nhận được danh sách Thành Viên mới nhất.');
  memberAdminState.members=data.members;memberAdminState.loaded=true;
  return data.members;
}
let playRosterPresenceTimer=null;
async function playRefreshRosterPresence(){
  const sheet=document.getElementById('playRosterSheet');
  if(!sheet||sheet.classList.contains('hidden'))return;
  try{
    const members=await playLoadFreshRosterMembers();
    if(sheet.classList.contains('hidden'))return;
    const live=new Map(members.map(m=>[String(m.loginId),m]));
    document.querySelectorAll('#playRosterList .play-roster-row').forEach(row=>{
      const member=live.get(String(row.dataset.loginId||'')),online=member?.online===true;
      const dot=row.querySelector('.play-roster-presence');
      if(!dot)return;
      dot.classList.toggle('is-online',online);dot.classList.toggle('is-offline',!online);
      dot.setAttribute('aria-label',online?'Đang trực tuyến':'Đang ngoại tuyến');
      dot.title=online?'Đang trực tuyến':'Đang ngoại tuyến';
      row.dataset.presence=online?'online':'offline';
    });
    applyPlayRosterFilter();
  }catch(err){console.warn('[GMWW roster presence]',err)}
}
async function openPlayRosterSheet(){
  if(!isLivePlayRoom()){await playCreateRoom();return}
  const sheet=document.getElementById('playRosterSheet'),list=document.getElementById('playRosterList');if(!sheet||!list)return;
  list.innerHTML='<div class="member-empty">Đang đồng bộ trạng thái Thành Viên…</div>';
  let rows;
  try{rows=await playLoadFreshRosterMembers()}
  catch(err){list.innerHTML='<div class="member-empty member-error">'+playEsc(err.message||'Không đồng bộ được trạng thái.')+'</div>';sheet.classList.remove('hidden');return}
  const selected=new Set((playSceneState.selectedMemberIds||[]).map(String));
  document.getElementById('playRosterRoomLabel').textContent='Phòng '+playSceneState.roomCode;list.innerHTML='';
  for(const m of rows){
    const b=document.createElement('button');b.type='button';b.className='play-roster-row'+(selected.has(String(m.loginId))?' selected':'');b.dataset.loginId=String(m.loginId);b.dataset.presence=m.online===true?'online':'offline';
    const initial=(String(m.displayName||m.loginId||'?').trim().charAt(0)||'?').toUpperCase();
    const online=m.online===true,status=online?'Đang trực tuyến':'Đang ngoại tuyến';
    b.innerHTML='<img alt=""><div><b>'+playEsc(m.displayName||m.loginId)+'</b></div><span class="play-roster-presence '+(online?'is-online':'is-offline')+'" role="img" aria-label="'+status+'" title="'+status+'"></span><span class="play-roster-check">✓</span>';
    const img=b.querySelector('img'),characterSrc=playCharacterUrl(m.gameCharacterId);img.src=characterSrc||memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{if(characterSrc&&img.src!==memberAvatarUrl(m.gameCharacterId||m.avatarId)){img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);return}const s=document.createElement('span');s.className='play-roster-avatar-fallback';s.textContent=initial;img.replaceWith(s)};
    b.onclick=()=>{b.classList.toggle('selected');updatePlayRosterCount()};list.appendChild(b);
  }
  if(!rows.length)list.innerHTML='<div class="member-empty">Chưa có Thành Viên trong danh bạ.</div>';
  sheet.classList.remove('hidden');updatePlayRosterCount();setPlayRosterFilter('all');
  if(playRosterPresenceTimer)clearInterval(playRosterPresenceTimer);
  playRosterPresenceTimer=setInterval(()=>{if(!document.hidden)void playRefreshRosterPresence()},10000);
}
function closePlayRosterSheet(){if(playRosterPresenceTimer)clearInterval(playRosterPresenceTimer);playRosterPresenceTimer=null;document.getElementById('playRosterSheet')?.classList.add('hidden')}
async function savePlayRosterIds(ids){
  if(playSceneRuntime.busy)return;ids=[...new Set((ids||[]).map(String).filter(Boolean))];if(!ids.length){playFlashError('Hãy chọn ít nhất 1 Người Chơi.');return}
  const existing=new Map(playLiveMembers().map(p=>[String(p.loginId),p])),source=memberAdminState.members||[],chosen=source.filter(m=>ids.includes(String(m.loginId))).map(m=>({loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:m.gameCharacterId||existing.get(String(m.loginId))?.gameCharacterId||null,seatId:existing.get(String(m.loginId))?.seatId||null}));
  if(playSceneState.roomMode==='online'){
    const offline=chosen.filter(m=>!source.find(x=>String(x.loginId)===String(m.loginId))?.online);if(offline.length){playFlashError('Chế độ ONLINE chỉ chọn Người Chơi đang Online.');return}
  }
  playSetBusy(true);const save=document.getElementById('playRosterSave');if(save)save.disabled=true;
  try{
    const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:chosen,replace:true})});
    playSceneState.selectedMemberIds=ids;playSceneState.step='seats';void playPublishStage('seats');playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;savePlayScene();closePlayRosterSheet();await playSyncRoom(true);renderPlayScene()
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false);if(save)save.disabled=false}
}
async function savePlayRoster(){return savePlayRosterIds(playRosterSelectedIds())}

function playApplyLobbyStage(generation){
  playSceneRuntime.syncSerial++;
  disconnectPlaySocket();
  playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;
  playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;
  playSceneState.lobbyGeneration=Math.max(Number(playSceneState.lobbyGeneration||0),Number(generation||0));
  playSceneState.activePlayerId='';playSceneState.selectedMemberIds=[];playSceneState.assignmentsPreview=[];
  playSceneState.matchId='';playSceneState.artifactCount=0;playSceneState.rolePlan={};playSceneState.gameTemplateId='';
  playSceneRuntime.room=null;playSceneRuntime.players=[];playSceneRuntime.assignments=[];
  playSceneRuntime.gameConfig=null;playSceneRuntime.nightRuntime=null;playSceneRuntime.winProposal=null;
  playSceneRuntime.activeEffects=[];playSceneRuntime.lastError='';
  playRoomUiState.selectedCode='';playRoomUiState.stage='rooms';playRoomUiState.editorMode='';
  savePlayRoomRegistry(playRoomRegistry().map(r=>({...r,enabled:false})));
  document.getElementById('playCreateRoomSheet')?.classList.add('hidden');
  savePlayScene();renderPlayScene();
}
async function playReturnToLobby(){
  if(playSceneRuntime.busy||playSceneState.step==='lobby')return false;
  if(!confirm('Trở về SẢNH CHỜ?\nHệ thống sẽ RESET và TẮT tất cả phòng, kết thúc các ván đang diễn ra và đưa người chơi trên mọi thiết bị về sảnh chờ.\nTài khoản, nhân vật và Ván Mẫu vẫn được giữ nguyên.'))return false;
  playSetBusy(true);
  try{
    const data=await gmApi('/api/gm/lobby/reset',{method:'POST',body:JSON.stringify({source:'GM_BACK'})});
    if(data?.ok!==true||data?.reset!==true)throw new Error('Server chưa xác nhận reset toàn bộ phòng.');
    playApplyLobbyStage(data.generation);
    gmwwSendGmPresence(true);
    return true;
  }catch(err){playFlashError('Chưa thể về sảnh chờ. '+(err?.message||err));return false}
  finally{playSetBusy(false)}
}
async function backPlayPhase(){
  if(playSceneRuntime.busy)return;
  if(playSceneState.phase==='night'&&playSceneRuntime.nightRuntime&&Number(playSceneRuntime.nightRuntime.cursor||0)>0){
    playSetBusy(true);try{const d=await playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'back'})});playSceneRuntime.nightRuntime=d?.runtime||playSceneRuntime.nightRuntime;await playSyncRoom(true)}catch(err){playFlashError(err.message)}finally{playSetBusy(false)}return
  }
  if(playSceneState.phase!=='lobby'){await playSyncRoom(true);return}
  if(playSceneState.step==='lobby')return;
  if(playSceneState.step==='room'){await playReturnToLobby();return}
  advancePlaySetup(-1)
}
const PLAY_GAME_CHROME_IDLE_MS=30000;
let playGameChromeIdleTimer=0;
function setPlayGameChromeHidden(hidden){
  if(playSceneState.step==='seats'&&playSceneState.phase==='lobby')hidden=false;
  const top=document.getElementById('playSetupStrip'),bottom=document.getElementById('gmTopMenu'),gather=document.getElementById('playGatherToolbar');
  [top,bottom,gather].forEach(menu=>{if(!menu)return;menu.classList.toggle('is-auto-hidden',!!hidden);menu.dataset.autoHidden=hidden?'1':'0'});
}
function clearPlayGameChromeIdle(){
  if(playGameChromeIdleTimer){clearTimeout(playGameChromeIdleTimer);playGameChromeIdleTimer=0}
}
function resetPlayGameChromeIdle(){
  const top=document.getElementById('playSetupStrip'),bottom=document.getElementById('gmTopMenu');
  if(!top&&!bottom)return;
  setPlayGameChromeHidden(false);clearPlayGameChromeIdle();
  if(!document.body.classList.contains('play-immersive'))return;
  playGameChromeIdleTimer=setTimeout(()=>{if(document.body.classList.contains('play-immersive'))setPlayGameChromeHidden(true)},PLAY_GAME_CHROME_IDLE_MS);
}
function initPlayGameChromeAutoHide(){
  const top=document.getElementById('playSetupStrip'),bottom=document.getElementById('gmTopMenu');
  if((top?.dataset.autoHideBound==='1')||(bottom?.dataset.autoHideBound==='1'))return;
  if(top)top.dataset.autoHideBound='1';if(bottom)bottom.dataset.autoHideBound='1';
  const reveal=()=>resetPlayGameChromeIdle();
  document.addEventListener('pointerdown',reveal,{capture:true,passive:true});
  document.addEventListener('touchstart',reveal,{capture:true,passive:true});
  document.addEventListener('keydown',reveal,{capture:true});
  document.addEventListener('wheel',reveal,{capture:true,passive:true});
  let lastMove=0;
  document.addEventListener('mousemove',()=>{const now=Date.now();if(now-lastMove>800){lastMove=now;reveal()}},{capture:true,passive:true});
  top?.addEventListener('focusin',reveal);bottom?.addEventListener('focusin',reveal);document.getElementById('playGatherToolbar')?.addEventListener('focusin',reveal);
}
async function enterPlayImmersive(){
  document.body.classList.add('play-immersive');
  resetPlayGameChromeIdle();
  try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}
  if(isLivePlayRoom())await playSyncRoom(true);else renderPlayScene()
}
function exitPlayImmersive(){
  if(playSceneRuntime.busy)return;
  if(!confirm('Thoát về Trang Chủ?\nPhòng, vị trí và ván đang chơi vẫn được giữ nguyên. Thao tác này không kết thúc ván.'))return;
  document.body.classList.remove('play-immersive');
  if(typeof clearPlayGameChromeIdle==='function'){clearPlayGameChromeIdle();setPlayGameChromeHidden(false)}
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='home'));
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page==='home'));
  const home=document.getElementById('home');if(home)home.scrollTop=0;
  if(typeof gmwwHomeRefresh==='function')void gmwwHomeRefresh(false)
}
async function openPlayCreateRoomSheet(){const sheet=document.getElementById('playCreateRoomSheet');if(!sheet)return;if(isLivePlayRoom())await playSyncRoom(true);playRoomUiState.stage='rooms';playRoomUiState.selectedCode='';playRoomUiState.editorMode='';playRoomUiState.lastTapCode='';playRoomUiState.lastTapAt=0;const seats=document.getElementById('playCreateRoomSeatCount');if(seats)seats.value=String(playSceneState.seatCount||12);renderPlayCreateRoomSheet();sheet.classList.remove('hidden');bindPlayRoomModeButtons()}
const GMWW_GATHER_DRAG_KEY='GMWW_GATHER_DRAG_OFFSET_V1';
function playGatherBoundCorrection(rect,bounds){
  const shift=(start,end,minimum,maximum)=>{
    if(end-start>maximum-minimum)return minimum-start;
    if(start<minimum)return minimum-start;
    if(end>maximum)return maximum-end;
    return 0;
  };
  return {x:shift(rect.left,rect.right,bounds.left,bounds.right),
          y:shift(rect.top,rect.bottom,bounds.top,bounds.bottom)};
}
function initDraggablePlayGatherToolbar(){
  const bar=document.getElementById('playGatherToolbar'),handle=bar?.querySelector('.play-gather-toolbar-head');
  if(!bar||!handle||bar.dataset.dragBound==='1')return;
  bar.dataset.dragBound='1';
  handle.style.touchAction='none';
  handle.style.cursor='grab';
  let x=0,y=0,drag=null;
  try{
    const saved=JSON.parse(localStorage.getItem(GMWW_GATHER_DRAG_KEY)||'null');
    if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){
      x=Math.max(-2000,Math.min(2000,saved.x));y=Math.max(-2000,Math.min(2000,saved.y));
    }
  }catch{}
  const apply=()=>{
    bar.style.setProperty('--gmww-gather-drag-x',x+'px');
    bar.style.setProperty('--gmww-gather-drag-y',y+'px');
  };
  const boundaries=()=>{
    const viewport=window.visualViewport;
    const vx=Number(viewport?.offsetLeft||0),vy=Number(viewport?.offsetTop||0);
    const vw=Number(viewport?.width||window.innerWidth),vh=Number(viewport?.height||window.innerHeight);
    const timeline=document.getElementById('playSetupStrip');
    const bottomDock=document.getElementById('gmTopMenu');
    const timelineEnd=timeline&&!timeline.classList.contains('is-auto-hidden')?timeline.getBoundingClientRect().bottom+8:vy+8;
    const dockStart=bottomDock&&!bottomDock.classList.contains('is-auto-hidden')?bottomDock.getBoundingClientRect().top-8:vy+vh-8;
    return {left:vx+7,right:vx+vw-7,top:Math.max(vy+8,timelineEnd),bottom:Math.min(vy+vh-8,dockStart)};
  };
  const clampOnscreen=()=>{
    if(bar.classList.contains('hidden')||!bar.getClientRects().length)return;
    const fix=playGatherBoundCorrection(bar.getBoundingClientRect(),boundaries());
    if(fix.x||fix.y){x+=fix.x;y+=fix.y;apply()}
  };
  bar.gmwwGatherClampOnscreen=clampOnscreen;
  apply();
  const save=()=>{try{localStorage.setItem(GMWW_GATHER_DRAG_KEY,JSON.stringify({x,y}))}catch{}};
  handle.addEventListener('pointerdown',e=>{
    if(bar.classList.contains('hidden')||e.target.closest('button,input,textarea,select,a'))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:x,baseY:y};
    bar.classList.add('is-dragging');
    handle.style.cursor='grabbing';
    try{handle.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    x=drag.baseX+e.clientX-drag.startX;
    y=drag.baseY+e.clientY-drag.startY;
    apply();clampOnscreen();
    e.preventDefault();
  });
  const end=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    drag=null;bar.classList.remove('is-dragging');handle.style.cursor='grab';
    try{handle.releasePointerCapture(e.pointerId)}catch{}
    clampOnscreen();save();
  };
  handle.addEventListener('pointerup',end);
  handle.addEventListener('pointercancel',end);
  handle.addEventListener('dblclick',e=>{
    if(e.target.closest('button,input,textarea,select,a'))return;
    x=0;y=0;apply();clampOnscreen();save();e.preventDefault();
  });
  handle.addEventListener('keydown',e=>{
    const arrows={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
    const d=arrows[e.key];if(!d)return;
    x+=d[0];y+=d[1];apply();clampOnscreen();save();e.preventDefault();
  });
  window.addEventListener('resize',clampOnscreen,{passive:true});
  window.visualViewport?.addEventListener('resize',clampOnscreen,{passive:true});
  requestAnimationFrame(clampOnscreen);
}
function initDraggablePlaySheets(){
  document.querySelectorAll('.sheet .sheet-card').forEach(card=>{
    if(card.dataset.dragBound==='1')return;card.dataset.dragBound='1';
    const handle=card.querySelector('.sheet-head');if(!handle)return;
    handle.style.touchAction='none';handle.style.cursor='grab';
    let active=false,startX=0,startY=0,baseX=0,baseY=0,pid=null;
    handle.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,select,textarea'))return;active=true;pid=e.pointerId;startX=e.clientX;startY=e.clientY;baseX=Number(card.dataset.dragX||0);baseY=Number(card.dataset.dragY||0);handle.setPointerCapture?.(pid);handle.style.cursor='grabbing';e.preventDefault()});
    handle.addEventListener('pointermove',e=>{if(!active||e.pointerId!==pid)return;const maxX=Math.max(0,(innerWidth-card.offsetWidth)/2),maxY=Math.max(0,(innerHeight-card.offsetHeight)/2);const x=Math.max(-maxX,Math.min(maxX,baseX+e.clientX-startX)),y=Math.max(-maxY,Math.min(maxY,baseY+e.clientY-startY));card.dataset.dragX=x;card.dataset.dragY=y;card.style.transform='translate('+x+'px,'+y+'px)';e.preventDefault()});
    const end=e=>{if(!active||e.pointerId!==pid)return;active=false;handle.style.cursor='grab';try{handle.releasePointerCapture?.(pid)}catch{}};
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  });
}
async function handlePlayTimelineStep(step){
  if(playSceneRuntime.busy)return;
  const from=PLAY_STEPS.indexOf(playSceneState.step),target=PLAY_STEPS.indexOf(step);
  if(from<0||target<0)return;
  if(target===from){
    if(step==='seats'){playGatherToolsDismissed=false;renderPlayGatherToolbar();return}
    if(step==='room')await openPlayCreateRoomSheet();
    else if(step==='game')await openPlayGameSheet();
    return;
  }
  if(target===from+1){await advancePlayPhase();return}
  if(target<from){
    if(step==='lobby'){await playReturnToLobby();return}
    setPlayStep(step);
    if(step==='room')await openPlayCreateRoomSheet();
    else if(step==='game')await openPlayGameSheet();
    return;
  }
  playFlashError('Hãy hoàn tất bước hiện tại trước khi chuyển đến bước này.');
}
function initPlayScene(){
  const shell=document.getElementById('playShell');if(!shell)return;
  initPlayGameChromeAutoHide();
  initDraggablePlaySheets();
  initDraggablePlayGatherToolbar();
  document.getElementById('playGatherCall')?.addEventListener('click',()=>{void playGatherCallMembers()});
  document.getElementById('playGatherRandom')?.addEventListener('click',()=>{void playGatherRandomize()});
  document.getElementById('playGatherManual')?.addEventListener('click',playGatherManual);
  document.getElementById('playGatherDisband')?.addEventListener('click',openPlayDisbandSheet);
  document.getElementById('playGatherConfirm')?.addEventListener('click',()=>{void playGatherConfirm()});
  document.getElementById('playGatherClose')?.addEventListener('click',()=>{playGatherToolsDismissed=false;renderPlayGatherToolbar()});
  document.getElementById('playDisbandClose')?.addEventListener('click',closePlayDisbandSheet);
  document.getElementById('playDisbandAll')?.addEventListener('click',()=>{void playDisbandAll()});
  document.getElementById('playDisbandSheet')?.addEventListener('click',ev=>{if(ev.target===document.getElementById('playDisbandSheet'))closePlayDisbandSheet()});
  document.querySelectorAll('[data-play-step]').forEach(b=>b.addEventListener('click',()=>{void handlePlayTimelineStep(b.dataset.playStep)}));
  document.getElementById('playPhasePill')?.addEventListener('click',()=>{void advancePlayPhase()});
  document.getElementById('playExitVillage')?.addEventListener('click',exitPlayImmersive);
  document.querySelectorAll('.nav[data-page="start"]').forEach(n=>n.addEventListener('click',enterPlayImmersive));
  document.getElementById('playAutoGM')?.addEventListener('click',togglePlayAutoGM);
  document.getElementById('playRefreshServer')?.addEventListener('click',refreshPlayServerRealtime);
  document.getElementById('playAudioTop')?.addEventListener('click',togglePlayAudio);
  document.getElementById('playPrimaryAction')?.addEventListener('click',()=>{
    if(playSceneState.step==='room'){openPlayCreateRoomSheet();return}
    advancePlayPhase();
  });
  document.getElementById('playEndGame')?.addEventListener('click',openPlayEndSheet);
  document.querySelectorAll('[data-play-card]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-play-card]').forEach(x=>x.classList.toggle('is-front',x===b))}));
  document.getElementById('playRoomButton')?.addEventListener('click',openPlayGMSheet);
  document.getElementById('playGMClose')?.addEventListener('click',closePlayGMSheet);
  document.getElementById('playGMSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playGMSheet'))closePlayGMSheet()});
  document.getElementById('playGMKill')?.addEventListener('click',async()=>{if(await applyPlayPlayerState('dead'))closePlayGMSheet()});
  document.getElementById('playGMRevive')?.addEventListener('click',async()=>{if(await applyPlayPlayerState('revive'))closePlayGMSheet()});
  document.getElementById('playRosterClose')?.addEventListener('click',closePlayRosterSheet);document.getElementById('playRosterCancel')?.addEventListener('click',closePlayRosterSheet);
  document.getElementById('playRosterSave')?.addEventListener('click',savePlayRoster);
  document.querySelectorAll('#playRosterFilters [data-play-roster-filter]').forEach(btn=>btn.addEventListener('click',()=>setPlayRosterFilter(btn.dataset.playRosterFilter)));
  document.getElementById('playRosterSelectAll')?.addEventListener('click',()=>{const rows=[...document.querySelectorAll('#playRosterList .play-roster-row')].filter(x=>!x.classList.contains('hidden')),all=rows.length&&rows.every(x=>x.classList.contains('selected'));rows.forEach(x=>x.classList.toggle('selected',!all));updatePlayRosterCount()});
  document.getElementById('playRosterSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playRosterSheet'))closePlayRosterSheet()});
  document.getElementById('playSeatClose')?.addEventListener('click',closePlaySeatSheet);document.getElementById('playSeatCancel')?.addEventListener('click',closePlaySeatSheet);document.getElementById('playSeatRelease')?.addEventListener('click',releaseSelectedPlayerSeat);
  document.querySelectorAll('[data-play-seat-member-mode]').forEach(b=>b.addEventListener('click',()=>{playSeatCandidateMode=b.dataset.playSeatMemberMode==='offline'?'offline':'online';renderPlaySeatSheet()}));
  document.getElementById('playSeatSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playSeatSheet'))closePlaySeatSheet()});
  document.getElementById('playGameClose')?.addEventListener('click',closePlayGameSheet);document.getElementById('playGameCancel')?.addEventListener('click',closePlayGameSheet);
  document.getElementById('playGameSave')?.addEventListener('click',savePlayGame);
  document.getElementById('playGameDelete')?.addEventListener('click',async()=>{
    const id=String(playSceneState.gameTemplateId||'');if(!id||document.querySelector('.play-game-sheet-card')?.dataset.mode!=='library')return;
    if(!confirm('Xóa Ván Mẫu đã lưu? Thao tác này không thể hoàn tác.'))return;
    const button=document.getElementById('playGameDelete');if(button)button.disabled=true;
    try{const result=await gmApi('/api/gm/game-templates/'+encodeURIComponent(id),{method:'DELETE'});if(result?.ok!==true)throw new Error('Server chưa xác nhận xóa Ván Mẫu.');playSceneState.gameTemplateId='';closePlayGameSheet();await loadPlayGameTemplates();renderGameTemplateLibrary()}
    catch(err){playFlashError(err?.message||'Không xóa được Ván Mẫu.')}
    finally{if(button)button.disabled=false}
  });
  for(const id of ['playTemplateRoleSearch','playTemplateRoleFaction','playTemplateOnlyStarred'])document.getElementById(id)?.addEventListener(id==='playTemplateRoleSearch'?'input':'change',playTemplateRenderCatalog);
  for(const id of ['playVillageDiscussionSec','playWolfDiscussionSec','playDefaultActionSec','playArtifactActionSec','playAutoAdvance'])document.getElementById(id)?.addEventListener('change',e=>{
    playSceneState.gameTiming=playSceneState.gameTiming||{};
    const key={playVillageDiscussionSec:'villageDiscussionSec',playWolfDiscussionSec:'wolfDiscussionSec',playDefaultActionSec:'defaultActionSec',playArtifactActionSec:'artifactActionSec',playAutoAdvance:'autoAdvance'}[id];
    playSceneState.gameTiming[key]=id==='playAutoAdvance'?!!e.currentTarget.checked:Math.max(0,Math.min(3600,Number(e.currentTarget.value)||0));
    savePlayScene();if(id==='playDefaultActionSec')renderPlayGameRoleTimings();
  });
  document.getElementById('playArtifactsEnabled')?.addEventListener('change',e=>{playSceneState.artifactsEnabled=!!e.currentTarget.checked;if(playSceneState.artifactsEnabled&&!playTemplateSelectedArtifacts().length)playSceneState.artifactIds=playFavoriteArtifacts().map(a=>String(a.id));savePlayScene();updatePlayArtifactToggle()});
  document.getElementById('playArtifactLimitPerCycle')?.addEventListener('change',e=>{const n=Math.max(0,Math.min(30,Math.trunc(Number(e.currentTarget.value)||0)));e.currentTarget.value=String(n);playSceneState.artifactLimitPerCycle=n;savePlayScene()});
  document.getElementById('playGameSuggest')?.addEventListener('click',suggestPlayGameRoles);
  document.getElementById('playGameClear')?.addEventListener('click',()=>{playSceneState.rolePlan={};savePlayScene();renderPlayGameRoles();updatePlayGameRoleCount()});
  document.getElementById('playGameSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playGameSheet'))closePlayGameSheet()});
  document.querySelectorAll('[data-play-winner]').forEach(b=>b.addEventListener('click',()=>selectPlayWinner(b.dataset.playWinner)));
  document.getElementById('playUseWinProposal')?.addEventListener('click',()=>selectPlayWinner(playSceneRuntime.winProposal?.winnerFaction||''));
  document.getElementById('playEndConfirm')?.addEventListener('click',confirmPlayEndGame);
  document.getElementById('playEndClose')?.addEventListener('click',closePlayEndSheet);document.getElementById('playEndCancel')?.addEventListener('click',closePlayEndSheet);
  document.getElementById('playEndSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playEndSheet'))closePlayEndSheet()});
  document.querySelector('.play-core-pearl')?.addEventListener('click',openPlayCreateRoomSheet);
  document.getElementById('playCreateRoomAdd')?.addEventListener('click',()=>openPlayRoomEditor(true));document.getElementById('playCreateRoomSave')?.addEventListener('click',savePlayRoomEditor);
  document.getElementById('playCreateRoomSeatCount')?.addEventListener('change',e=>{playSceneState.seatCount=Math.max(1,Math.min(30,Number(e.target.value)||12));e.target.value=String(playSceneState.seatCount);savePlayScene();if(isLivePlayRoom())playUpdateRoomSettings({seatCount:playSceneState.seatCount})});
  document.getElementById('playCreateRoomEnabled')?.addEventListener('click',playToggleRoomEnabled);document.getElementById('playRoomNextStep')?.addEventListener('click',playCreateRoomNext);
  document.getElementById('playCreateRoomReset')?.addEventListener('click',playResetCreatedRoom);
  document.getElementById('playCreateRoomDelete')?.addEventListener('click',playDeleteCreatedRoom);
  document.getElementById('playCreateRoomClose')?.addEventListener('click',()=>document.getElementById('playCreateRoomSheet')?.classList.add('hidden'));
  document.getElementById('playUserAvatar')?.setAttribute('hidden','');
  document.getElementById('playWorld')?.addEventListener('click',async e=>{if(e.target.closest?.('button,.play-player-token,.play-village-core,.play-hud,.play-world-status'))return;const r=e.currentTarget.getBoundingClientRect(),raw=globalThis.GMWW_VILLAGE_LAYOUT.fromScreen(e.clientX-r.left,e.clientY-r.top,r.width,r.height);if(!globalThis.GMWW_VILLAGE_LAYOUT.inside(raw.x,raw.y))return;const activeId=String(playSceneState.activePlayerId||''),gmSelected=activeId==='gm:online',p=selectedPlayPlayer();if(gmSelected||!activeId){await gmwwMoveGmCharacter(raw.x,raw.y);return}if(!isLivePlayRoom())return;if(p&&!p.seatId&&!playSceneRuntime.room?.seatsLocked){try{const d=await playRoomApi('/move',{method:'POST',body:JSON.stringify({participantId:p.participantId,...raw})});playSceneRuntime.players=d.players||playSceneRuntime.players;renderPlayPlayers()}catch(err){playFlashError(err.message)}return}});
  window.addEventListener('resize',renderPlayScene);
  bindPlayRoomModeButtons();bindPlaySeatMoveButtons();renderPlayScene();document.body.classList.add('play-immersive');document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='start'));if(isLivePlayRoom())setTimeout(()=>playSyncRoom(true),80);
  if(!playSceneRuntime.pollTimer)playSceneRuntime.pollTimer=setInterval(()=>{if(document.getElementById('start')?.classList.contains('active')){if(isLivePlayRoom()){if(!playSceneRuntime.socket||playSceneRuntime.socket.readyState!==WebSocket.OPEN)playSyncRoom(false)}else gmApi('/api/gm/members').then(d=>{memberAdminState.members=d.members||[];renderPlayPlayers()}).catch(()=>{})}},15000);
}
document.querySelectorAll('[data-page="start"]').forEach(el=>el.addEventListener('click',()=>setTimeout(async()=>{try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}if(isLivePlayRoom())await playSyncRoom(true);else renderPlayScene()},40)));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPlayScene,{once:true});else initPlayScene();

})();


