// run tests on the users page
describe('Users Page', function () {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/users');
    });

    // tests its on the users page
    it('should be on the users page', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/users');
    });

    // add a user
    it('should add a new user', function () {
        // open the add payment modal and fill in the form
        var saveModal = element(by.id('saveUser'));
        element(by.css('nav ul li a i.fa-plus-square')).click();
        expect(saveModal.isDisplayed()).toBe(true);
        saveModal.element(by.model('newuser.username')).sendKeys('TestUser');
        saveModal.element(by.model('newuser.password')).sendKeys('password');

        expect(saveModal.element(by.buttonText('Save')).isEnabled()).toBe(true);
        saveModal.element(by.buttonText('Save')).click();

        // check the user was added
        element.all(by.repeater('obj in users')).filter(function(row) {
            return row.getText().then(function(txt) {
                return (txt.indexOf('TestUser') > -1);
            });
        }).then(function(elem){
            expect(elem[0]).toBeTruthy();
        })
    });
});
