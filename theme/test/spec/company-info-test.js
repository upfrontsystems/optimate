// run test on the clients page
describe('Company information Page', function () {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/company_information');
    });

    // tests its on the page
    it('should be on the company information page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/company_information');
    });

    // edit the info
    it('should edit the company information', function () {
        var editModal = element(by.id('editCompanyInformation'));
        element(by.css('nav ul li a i.fa-pencil')).click();
        expect(editModal.isDisplayed()).toBe(true);
        editModal.element(by.model('formData.Name')).clear().sendKeys('EditedName');

        editModal.element(by.buttonText('Update')).click();

        element(by.css('nav ul li a i.fa-pencil')).click();
        expect(editModal.isDisplayed()).toBe(true);
        editModal.element(by.model('formData.Name')).clear().sendKeys('TETIUS RABE PROPERTY SERVICES');
        editModal.element(by.buttonText('Update')).click();
    });
});
