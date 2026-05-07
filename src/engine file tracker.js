// ─── APEX TRAINING ENGINE v3 ─────────────────────────────────────────
var TrainingEngine = {

  // ── TRAINING WEEK NUMBER ─────────────────────────────────────────
  getTrainingWeek: function() {
    var runs = DB.getArr('run_sessions');
    if (!runs.length) return 1;
    var firstDate = new Date(runs[0].date + 'T00:00:00');
    var diffDays = Math.floor((new Date() - firstDate) / 86400000);
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  },

  getCycleWeek: function() {
    return ((TrainingEngine.getTrainingWeek() - 1) % 4) + 1;
  },

  // ── SMART PERFORMANCE ANALYSIS ───────────────────────────────────
  // Analyses actual pace vs target pace + RPE to determine true fitness
  analyzePerformance: function() {
    var runs = DB.getArr('run_sessions').slice(-6);
    if (!runs.length) return { level: 'unknown', trend: 'stable', adjustMultiplier: 1.0 };

    var efforts = runs.map(function(r) { return r.effort || 3; });
    var avgEffort = efforts.reduce(function(a,b){ return a+b; },0) / efforts.length;

    // Check pace vs target (if GPS data available)
    var paceAnalysis = runs.filter(function(r) {
      return r.gps && r.distance && r.duration;
    }).map(function(r) {
      var actualPace = Math.round(r.duration * 60 / r.distance); // sec/km
      var best = DB.get('cooper_best') || USER_BASE.cooperBest;
      var zones = vo2ToPaces(cooperToVO2(best));
      var targetPace = r.runType === 'INTERVAL' ? zones.interval.hi :
                       r.runType === 'TEMPO' ? zones.tempo.hi : zones.easy.hi;
      return { ratio: actualPace / targetPace, effort: r.effort || 3 };
    });

    // If running faster than target with low effort → very fit, push harder
    // If running slower than target with high effort → back off
    var adjustMultiplier = 1.0;
    if (paceAnalysis.length >= 2) {
      var avgRatio = paceAnalysis.reduce(function(a,p){ return a+p.ratio; },0) / paceAnalysis.length;
      var avgPaceEffort = paceAnalysis.reduce(function(a,p){ return a+p.effort; },0) / paceAnalysis.length;
      if (avgRatio < 0.95 && avgPaceEffort <= 3) adjustMultiplier = 1.15; // faster + easy = push more
      else if (avgRatio > 1.08 && avgPaceEffort >= 4) adjustMultiplier = 0.88; // slower + hard = back off
      else if (avgRatio < 0.98 && avgPaceEffort <= 2) adjustMultiplier = 1.10;
    }

    // Effort-based trend
    var trend = 'stable';
    if (efforts.length >= 3) {
      var recentAvg = efforts.slice(-2).reduce(function(a,b){return a+b;},0)/2;
      var prevAvg = efforts.slice(0,-2).reduce(function(a,b){return a+b;},0)/Math.max(1,efforts.length-2);
      if (recentAvg < prevAvg - 0.5) { trend = 'improving'; adjustMultiplier *= 1.05; }
      else if (recentAvg > prevAvg + 0.5) { trend = 'declining'; adjustMultiplier *= 0.92; }
    }

    return {
      avgEffort: avgEffort,
      trend: trend,
      adjustMultiplier: Math.max(0.7, Math.min(1.3, adjustMultiplier)),
      paceData: paceAnalysis.length,
    };
  },

  // ── FITNESS PHASE ────────────────────────────────────────────────
  getPhase: function() {
    var best = DB.get('cooper_best') || USER_BASE.cooperBest;
    if (best >= 2800) return 3;
    if (best >= 2600) return 2;
    return 1;
  },

  // ── DELOAD CHECK ─────────────────────────────────────────────────
  needsDeload: function() {
    var cw = TrainingEngine.getCycleWeek();
    if (cw === 4) return 'scheduled';
    var perf = TrainingEngine.analyzePerformance();
    if (perf.avgEffort >= 4.3) return 'high_effort';
    var gyms = DB.getArr('gym_sessions').slice(-4);
    var gymFat = gyms.length ? gyms.reduce(function(a,g){return a+(g.fatigue||3);},0)/gyms.length : 3;
    if (gymFat >= 4.2) return 'gym_fatigue';
    return null;
  },

  // ── VOLUME MULTIPLIER ────────────────────────────────────────────
  volumeMultiplier: function(perfMultiplier) {
    var cw = TrainingEngine.getCycleWeek();
    if (cw === 4) return 0.65;
    var base = [1.0, 1.08, 1.17][cw - 1] || 1.0;
    return Math.max(0.65, Math.min(1.35, base * (perfMultiplier || 1.0)));
  },

  // ── MAIN: GENERATE WEEKLY PLAN ───────────────────────────────────
  generateWeekPlan: function() {
    var deload = TrainingEngine.needsDeload();
    var phase = TrainingEngine.getPhase();
    var perf = TrainingEngine.analyzePerformance();
    var mult = TrainingEngine.volumeMultiplier(perf.adjustMultiplier);
    var best = DB.get('cooper_best') || USER_BASE.cooperBest;
    var vo2 = cooperToVO2(best);
    var zones = vo2ToPaces(vo2);
    var cw = TrainingEngine.getCycleWeek();

    // Save this week's plan to history
    var weekNum = TrainingEngine.getTrainingWeek();
    var savedPlan = DB.get('week_plan_' + weekNum);

    var plan;
    if (deload) {
      plan = TrainingEngine._deloadPlan(zones, deload);
    } else if (phase === 1) {
      plan = TrainingEngine._basePlan(zones, mult, cw, perf);
    } else if (phase === 2) {
      plan = TrainingEngine._buildPlan(zones, mult, cw, perf);
    } else {
      plan = TrainingEngine._peakPlan(zones, mult, cw, perf);
    }

    plan.weekNum = weekNum;
    plan.cycleWeek = cw;
    plan.perf = perf;
    plan.generatedAt = today();

    // Save plan for this week
    if (!savedPlan) DB.set('week_plan_' + weekNum, plan);

    return plan;
  },

  // ── BASE PLAN (Cooper <2600) ──────────────────────────────────────
  _basePlan: function(zones, mult, cw, perf) {
    var reps = Math.max(4, Math.min(10, Math.round(6 * mult)));
    var tempoMin = Math.max(15, Math.min(28, Math.round(20 * mult)));
    var easyKm = Math.max(5, Math.min(11, Math.round(7 * mult * 10)/10));
    var iTotalKm = Math.round((reps * 0.4 + 2) * 10)/10;
    var tApproxKm = Math.round(tempoMin / 60 * (3600 / zones.tempo.hi) * 10)/10;

    var adaptNote = '';
    if (perf.trend === 'improving') adaptNote = ' ↑ Progression accelerated — you are improving faster than expected.';
    else if (perf.trend === 'declining') adaptNote = ' ↓ Load reduced — recent sessions showed higher fatigue.';

    return {
      type: 'base', label: 'Base Building',
      note: 'Cooper <2600m · Building aerobic foundation' + adaptNote,
      sessions: [
        {
          type: 'INTERVAL', label: 'Track Intervals — 400m',
          distance: iTotalKm + ' km total',
          targetPace: secsToMMSS(zones.interval.hi) + '–' + secsToMMSS(zones.interval.lo) + ' /km',
          sets: reps + ' × 400m', restBetween: '90 sec jog',
          description: '10 min easy warmup → ' + reps + '×400m at target pace with 90 sec jog rest → 10 min easy cooldown. Run each 400m at the same pace — do not sprint the first rep. Focus on consistency.',
          intensity: 4,
        },
        {
          type: 'TEMPO', label: 'Tempo Run — ' + tempoMin + ' min',
          distance: tApproxKm + ' km approx',
          targetPace: secsToMMSS(zones.tempo.hi) + '–' + secsToMMSS(zones.tempo.lo) + ' /km',
          description: '10 min easy warmup → ' + tempoMin + ' min steady at tempo pace → 10 min easy cooldown. You should be able to say a few words but not full sentences. Do not go faster than target.',
          intensity: 3,
        },
        {
          type: 'EASY', label: 'Long Easy Run — ' + easyKm + ' km',
          distance: easyKm + ' km',
          targetPace: secsToMMSS(zones.easy.hi) + '–' + secsToMMSS(zones.easy.lo) + ' /km',
          description: 'Fully conversational pace the entire run. If you cannot speak in full sentences — slow down. This is the most important run of the week.',
          intensity: 2,
        }
      ]
    };
  },

  // ── BUILD PLAN (Cooper 2600–2800) ────────────────────────────────
  _buildPlan: function(zones, mult, cw, perf) {
    var reps = Math.max(3, Math.min(7, Math.round(4 * mult)));
    var tempoMin = Math.max(22, Math.min(38, Math.round(28 * mult)));
    var easyKm = Math.max(8, Math.min(14, Math.round(10 * mult * 10)/10));
    var iTotalKm = Math.round((reps * 0.8 + 3) * 10)/10;
    var tApproxKm = Math.round(tempoMin / 60 * (3600 / zones.tempo.hi) * 10)/10;

    var adaptNote = '';
    if (perf.trend === 'improving') adaptNote = ' ↑ Volume increased — pace data shows you are ready.';
    else if (perf.trend === 'declining') adaptNote = ' ↓ Volume reduced — prioritizing recovery.';
    if (perf.paceData >= 2) adaptNote += ' (Based on ' + perf.paceData + ' GPS sessions)';

    return {
      type: 'build', label: 'Speed Development',
      note: 'Cooper 2600–2800m · Developing speed and lactate threshold' + adaptNote,
      sessions: [
        {
          type: 'INTERVAL', label: 'Track Intervals — 800m',
          distance: iTotalKm + ' km total',
          targetPace: secsToMMSS(zones.interval.hi) + '–' + secsToMMSS(zones.interval.lo) + ' /km',
          sets: reps + ' × 800m', restBetween: '2 min jog',
          description: '12 min easy warmup → ' + reps + '×800m at target pace with 2 min jog rest → 10 min cooldown. Each 800m should feel like 8.5/10 effort. Split each 800m evenly — first 400m controlled.',
          intensity: 4,
        },
        {
          type: 'TEMPO', label: 'Continuous Tempo — ' + tempoMin + ' min',
          distance: tApproxKm + ' km approx',
          targetPace: secsToMMSS(zones.tempo.hi) + '–' + secsToMMSS(zones.tempo.lo) + ' /km',
          description: '12 min easy warmup → ' + tempoMin + ' min at tempo pace → 10 min easy. Last 5 minutes will feel hard — hold pace. Do not slow down unless heart rate is very high.',
          intensity: 4,
        },
        {
          type: 'EASY', label: 'Long Aerobic Run — ' + easyKm + ' km',
          distance: easyKm + ' km',
          targetPace: secsToMMSS(zones.easy.hi) + '–' + secsToMMSS(zones.easy.lo) + ' /km',
          description: 'Easy throughout. Last 2 km can be slightly faster if you feel good. Builds the endurance foundation for 12 min continuous running at Cooper pace.',
          intensity: 2,
        }
      ]
    };
  },

  // ── PEAK PLAN (Cooper >2800) ─────────────────────────────────────
  _peakPlan: function(zones, mult, cw, perf) {
    var reps = Math.max(3, Math.min(6, Math.round(4 * mult)));
    var tempoMin = Math.max(28, Math.min(45, Math.round(35 * mult)));
    var easyKm = Math.max(10, Math.min(17, Math.round(13 * mult * 10)/10));
    var iTotalKm = Math.round((reps * 1.0 + 4) * 10)/10;
    var tApproxKm = Math.round(tempoMin / 60 * (3600 / zones.tempo.hi) * 10)/10;

    var adaptNote = perf.trend === 'improving' ? ' ↑ Peak progression — pushing toward 3100m.' :
                    perf.trend === 'declining' ? ' ↓ Managing fatigue at peak phase.' : '';

    return {
      type: 'peak', label: 'Peak — Cooper 3100m',
      note: 'Cooper >2800m · Final push to 3100m target' + adaptNote,
      sessions: [
        {
          type: 'INTERVAL', label: 'Track Intervals — 1000m',
          distance: iTotalKm + ' km total',
          targetPace: secsToMMSS(zones.interval.hi) + '–' + secsToMMSS(zones.interval.lo) + ' /km',
          sets: reps + ' × 1000m', restBetween: '90 sec jog',
          description: '15 min warmup → ' + reps + '×1000m at target pace with 90 sec rest → 12 min cooldown. This is your Cooper test pace. Treat each rep as a mini Cooper test — learn to control the discomfort.',
          intensity: 5,
        },
        {
          type: 'TEMPO', label: 'Tempo + Fast Finish — ' + tempoMin + ' min',
          distance: tApproxKm + ' km approx',
          targetPace: secsToMMSS(zones.tempo.hi) + '–' + secsToMMSS(zones.tempo.lo) + ' /km',
          description: '15 min easy → ' + (tempoMin-5) + ' min tempo → last 5 min at interval pace. Simulates Cooper test fatigue — you will feel tired at the end exactly like the real test.',
          intensity: 5,
        },
        {
          type: 'EASY', label: 'Long Run — ' + easyKm + ' km',
          distance: easyKm + ' km',
          targetPace: secsToMMSS(zones.moderate.hi) + '–' + secsToMMSS(zones.easy.lo) + ' /km',
          description: 'Easy to moderate. Last 3 km at moderate pace if feeling good. Builds stamina to sustain 3100m pace for 12 full minutes without slowing.',
          intensity: 3,
        }
      ]
    };
  },

  // ── DELOAD PLAN ──────────────────────────────────────────────────
  _deloadPlan: function(zones, reason) {
    var reasons = {
      scheduled: 'Week 4 of training cycle — planned recovery week.',
      high_effort: 'Recent sessions showed high fatigue. Recovery now = better performance next week.',
      gym_fatigue: 'High gym fatigue detected. Reducing run intensity this week.',
    };
    return {
      type: 'deload', label: 'Recovery Week',
      note: reasons[reason] || 'Recovery week.',
      sessions: [
        {
          type: 'EASY', label: 'Easy Recovery Run',
          distance: '4–5 km',
          targetPace: secsToMMSS(zones.easy.hi) + ' /km or slower',
          description: 'Very easy. Heart rate below 130 bpm. No pace targets. Walk if needed. This run exists only to keep legs moving — not to train.',
          intensity: 1,
        },
        {
          type: 'EASY', label: 'Short Shakeout',
          distance: '3–4 km',
          targetPace: secsToMMSS(zones.easy.hi) + ' /km or slower',
          description: 'Short and very easy. Legs should feel fresh after. No effort today.',
          intensity: 1,
        },
        {
          type: 'EASY', label: 'Optional Easy Jog or Full Rest',
          distance: '20–30 min or rest',
          targetPace: 'No target',
          description: 'Skip entirely if tired. Only run if you feel genuinely good. Recovery is the goal this week — not fitness.',
          intensity: 1,
        }
      ]
    };
  },

  // ── GYM WEIGHT SUGGESTIONS ───────────────────────────────────────
  gymSuggestion: function(movId) {
    var sessions = DB.getArr('gym_sessions');
    var relevant = sessions.filter(function(s) {
      return (s.sets||[]).some(function(x){ return x.movId===movId&&x.kg&&x.reps; });
    });
    if (!relevant.length) return null;
    var last = relevant.slice(-1)[0];
    var lastSets = (last.sets||[]).filter(function(x){ return x.movId===movId&&x.kg&&x.reps; });
    if (!lastSets.length) return null;
    var mov = ALL_MOVEMENTS.find(function(m){ return m.id===movId; });
    if (!mov) return null;
    var repLo = parseInt(mov.repRange.split('-')[0]);
    var repHi = parseInt(mov.repRange.split('-')[1]);
    var avgReps = lastSets.reduce(function(a,s){ return a+parseInt(s.reps); },0)/lastSets.length;
    var avgKg = lastSets.reduce(function(a,s){ return a+parseFloat(s.kg); },0)/lastSets.length;

    if (TrainingEngine.needsDeload()) {
      return { action:'deload', kg:Math.round(avgKg*0.8*2)/2, reason:'Deload week — 80% of normal weight' };
    }

    var stalling = false;
    if (relevant.length >= 3) {
      var last3w = relevant.slice(-3).map(function(s) {
        var sets = (s.sets||[]).filter(function(x){ return x.movId===movId&&x.kg; });
        return sets.length ? parseFloat(sets[0].kg) : 0;
      });
      stalling = last3w.every(function(w){ return w===last3w[0]; }) && avgReps < repLo+1;
    }

    if (avgReps >= repHi) return { action:'increase', kg:Math.round((avgKg+2.5)*2)/2, reason:'Hit top of range — add 2.5kg' };
    if (avgReps < repLo)  return { action:'decrease', kg:Math.round((avgKg-2.5)*2)/2, reason:'Below rep range — reduce 2.5kg' };
    if (stalling)         return { action:'same', kg:avgKg, reason:'Add 1 more rep before increasing weight' };
    return { action:'same', kg:avgKg, reason:'Good — aim for more reps' };
  },

  weeklyStress: function(weeksAgo) {
    weeksAgo = weeksAgo || 0;
    var runs = DB.getArr('run_sessions');
    var now = new Date();
    var ws = new Date(now); ws.setDate(now.getDate()-now.getDay()-(weeksAgo*7));
    var we = new Date(ws); we.setDate(ws.getDate()+7);
    var wS = ws.toISOString().split('T')[0]; var wE = we.toISOString().split('T')[0];
    return runs.filter(function(r){return r.date>=wS&&r.date<wE;})
      .reduce(function(a,r){return a+(r.effort||3)*2;},0);
  },
};
