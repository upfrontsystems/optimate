// run test on the units page
describe('Units Page', function () {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/units');
    });

    // tests its on the units page
    it('should be on the units page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/units');
    });

    // add a unit
    it('should add a new unit', function () {
        // open the add unit modal and fill in the form
        element(by.css('ul.nav:nth-child(1) > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.model('newUnit.Name')).sendKeys('TestUnit');

        element(by.css('ul.nav:nth-child(1) > li:nth-child(1) > button:nth-child(2)')).click()

        // check the unit was added
        element.all(by.repeater('obj in unitList')).filter(function(row) {
            return row.getText().then(function(txt) {
                return (txt.indexOf('TestUnit') > -1);
            });
        }).then(function(elem){
            elem[0].getText().then(function(text){
                expect(text.split(" ")[0]).toBe('TestUnit');
            });
        })
    });
});
