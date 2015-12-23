var social = require('social');

social.all(process.argv[2], function(err, result) {
    if (err) console.log(err);
    console.log(result);

    process.exit();
});
