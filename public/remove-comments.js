const fs = require('fs');

fs.readFile('styles.css', 'utf8', (err, data) => {
    if (err) throw err;
    const cleanedCSS = data.replace(/;\s*\/\*.*?\*\//g, ';');
    fs.writeFile('clean1-style.css', cleanedCSS, 'utf8', (err) => {
        if (err) throw err;
        console.log('Inline comments after ";" removed successfully!');
    });
});
