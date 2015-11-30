// run test on the units page
describe('Units Page', function () {

    var getTableElements = function(text) {
                    return element.all(by.cssContainingText('td.ng-binding', text))
                };

    var checkResult = function(name) {
        return getTableElements(name).then(function(found) {
            return found.length > 0;
        });
    };

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
        expect(checkResult('TestUnit')).toBe(true);
    });

    it('should filter a unit by name', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestUnit');
        // check the unit is displayed
        element(by.repeater('obj in unitList').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('TestUnit');
        });
    });

    it('should edit a unit', function () {
        // find the unit
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestUnit');
        // open the unit modal and fill in the form
        element(by.repeater('obj in unitList').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();
        element(by.model('newUnit.Name')).clear().sendKeys('EditUnit');
        element(by.css('ul.nav:nth-child(1) > li:nth-child(1) > button:nth-child(3)')).click()

        // check the unit was changed
        element(by.css('.navbar-right > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('EditUnit');
        element(by.repeater('obj in unitList').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('EditUnit');
            // change the name back
            element(by.repeater('obj in unitList').row(0)).click();
            element(by.css('nav ul li a i.fa-pencil')).click();
            element(by.model('newUnit.Name')).clear().sendKeys('TestUnit');
            element(by.css('ul.nav:nth-child(1) > li:nth-child(1) > button:nth-child(3)')).click()
        });
    });
});
