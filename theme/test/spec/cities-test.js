// run test on the cities page
describe('Cities Page', function () {
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

        element(by.css('ul.nav:nth-child(1) > li:nth-child(1) > button:nth-child(2)')).click()

        // check the city was added
        element.all(by.repeater('obj in cityList')).filter(function(row) {
            return row.getText().then(function(txt) {
                return (txt.indexOf('TestCity') > -1);
            });
        }).then(function(elem){
            elem[0].getText().then(function(text){
                expect(text.split(" ")[0]).toBe('TestCity');
            });
        })
    });
});
