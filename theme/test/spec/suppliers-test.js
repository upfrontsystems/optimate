// run test on the suppliers page
describe('Clients Page', function () {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/suppliers');
    });

    // tests its on the clients page
    it('should be on the clients page', function() {
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
        // element.all(by.repeater('obj in jsonsuppliers')).filter(function(row) {
        //     return row.getText().then(function(txt) {
        //         return (txt.indexOf('TestSupplier') > -1);
        //     });
        // }).then(function(elem){
        //     expect(elem[0]).toBeTruthy();
        // })
    });
});
