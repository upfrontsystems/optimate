// run test on the suppliers page
describe('Suppliers Page', function () {

    var getTableElements = function(text) {
                    return element.all(by.cssContainingText('td.ng-binding', text))
                };

    var checkResult = function(name) {
        return getTableElements(name).then(function(found) {
            return found.length > 0;
        });
    };

    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/suppliers');
    });

    // tests its on the suppliers page
    it('should be on the suppliers page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/suppliers');
    });

    // add a supplier
    it('should add a new supplier', function () {
        // open the add payment modal and fill in the form
        var saveModal = element(by.id('saveModal'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(saveModal.isDisplayed()).toBe(true);
        saveModal.element(by.model('formData.Name')).sendKeys('TestSupplier');
        saveModal.element(by.model('formData.SupplierCode')).sendKeys('0000');
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

        // check the supplier was added
        expect(checkResult('TestSupplier')).toBe(true);
    });

    it('should filter a supplier by name', function(){
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestSupplier');
        // check the supplier is displayed
        element(by.repeater('obj in jsonsuppliers').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('TestSupplier');
        });
    });

    it('should edit a supplier', function () {
        // find the supplier
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('TestSupplier');
        // open the edit modal and fill in the form
        element(by.repeater('obj in jsonsuppliers').row(0)).click();
        element(by.css('nav ul li a i.fa-pencil')).click();
        element(by.model('formData.Name')).clear().sendKeys('EditSupplier');
        element(by.buttonText('Update')).click();

        // check the supplier was changed
        element(by.css('.navbar-right > li:nth-child(2) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > a:nth-child(1)')).click();
        element(by.css('li.dropdown:nth-child(1) > ul:nth-child(2) > li:nth-child(1) > input:nth-child(1)')
            ).sendKeys('EditSupplier');
        element(by.repeater('obj in jsonsuppliers').row(0).column('obj.Name')).getText().then(function(name){
            expect(name).toBe('EditSupplier');
            // change the name back
            element(by.repeater('obj in jsonsuppliers').row(0)).click();
            element(by.css('nav ul li a i.fa-pencil')).click();
            element(by.model('formData.Name')).clear().sendKeys('TestSupplier');
            element(by.buttonText('Update')).click();
        });
    });
});
