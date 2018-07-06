//jshint esversion:6
var calcLevel = (xp) => {
    let lvl = 0,
        gap = 0;
    for (var i in [...Array(1000).keys()]) {
        gap = 36 + (9 * i);
        if (xp >= gap) {
            xp -= gap;
            lvl++;
        }
        if (xp < gap)
            break;
    }
    return {
        level: lvl,
        currentLevelXp: xp,
        nextLevelXp: gap
    };
};

exports.calcLevel = calcLevel;