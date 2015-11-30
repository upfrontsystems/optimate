// run test on the clients page
describe('Clients Page', function () {

    var getTableElements = function(text) {
        return element.all(by.cssContainingText('td.ng-binding', text))
    };

    var checkResult = function(name) {
        return getTableElements(name).then(function(found) {
            return found.length > 0;
        });
    };

    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/clients');
    });

    // tests its on the clients page
    it('should be on the clients page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/clients');
    });

    // add a client
    it('should add a new client', function () {
        // open the add payment modal and fill in the form
        var saveModal = element(by.id('saveModal'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(saveModal.isDisplayed()).toBe(true);
        saveModal.element(by.model('formData.Name')).sendKeys('TestClient');
        saveModal.element(by.model('formData.Address')).sendKeys('Address');
        var cityselect = saveModal.element(by.id('inputCity_chosen'))
        cityselect.click();
        browser.actions().sendKeys('TestCity').perform();
        cityselect.all(by.css('.chosen-results li')).then(function(items) {
            items[0].click();
        });
        saveModal.element(by.model('formData.StateProvince')).sendKeys('State');
        saveModal.element(by.model('formData.Country')).sendKeys('Country');
        saveModal.element(by.model('formData.Zipcode')).sendKeys('Zipcode');
        saveModal.element(by.model('formData.Phone')).sendKeys('Phone');
        saveModal.element(by.model('formData.Fax')).sendKeys('Fax');
        saveModal.element(by.model('formData.Cellular')).sendKeys('Cellular');
        saveModal.element(by.model('formData.Contact')).sendKeys('Contact');

        expect(saveModal.element(by.buttonText('Save')).isEnabled()).toBe(true);
        saveModal.element(by.buttonText('Save')).click();

        // check the client was added
        expect(checkResult('TestClient')).toBeTruthy();
    });

    it('should filter a client by name', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestClient');
        // check the client is displayed
        element(by.repeater('obj in jsonclients').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('TestClient');
        });
    });

    it('should edit a client', function () {
        // find the client
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestClient');
        // open the edit modal and fill in the form
        element(by.repeater('obj in jsonclients').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();
        element(by.model('formData.Name')).clear().sendKeys('EditClient');
        element(by.buttonText('Update')).click();

        // check the client was changed
        element(by.css('.navbar-right > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('EditClient');
        element(by.repeater('obj in jsonclients').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('EditClient');
            // change the name back
            element(by.repeater('obj in jsonclients').row(0)).click();
            element(by.css('nav ul li a i.fa-pencil')).click();
            element(by.model('formData.Name')).clear().sendKeys('TestClient');
            element(by.buttonText('Update')).click();
        });
    });
});
