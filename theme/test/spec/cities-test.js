// run test on the cities page
describe('Cities Page', function () {

    var getTableElements = function(text) {
        return element.all(by.cssContainingText('td.ng-binding', text))
    };

    var checkResult = function(name) {
        return getTableElements(name).then(function(found) {
            return found.length > 0;
        });
    };

    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/cities');
    });

    // tests its on the payments page
    it('should be on the cities page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/cities');
    });

    // add a city
    it('should add a new city', function () {
        // open the add city modal and fill in the form
        element(by.css('ul.nav:nth-child(1) > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.model('newItem.Name')).sendKeys('TestCity');
        element(by.css('button.ng-scope')).click()

        // check the city was added
        expect(checkResult('TestCity')).toBe(true);
    });

    it('should filter a city by name', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestCity');
        // check the city is displayed
        element(by.repeater('obj in cityList').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('TestCity');
        });
    });

    it('should edit a city', function () {
        // find the city
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestCity');
        // open the city modal and fill in the form
        element(by.repeater('obj in cityList').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();
        element(by.model('newItem.Name')).clear().sendKeys('EditCity');
        element(by.css('button.ng-scope')).click()

        // check the city was changed
        element(by.css('.navbar-right > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('EditCity');
        element(by.repeater('obj in cityList').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('EditCity');
            // change the name back
            element(by.repeater('obj in cityList').row(0)).click();
            element(by.css('nav ul li a i.fa-pencil')).click();
            element(by.model('newItem.Name')).clear().sendKeys('TestCity');
            element(by.css('button.ng-scope')).click()
        });
    });
});
