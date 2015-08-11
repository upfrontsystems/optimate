describe('Login page', function() {
    beforeEach(function () {
        browser.get('http://127.0.0.1:8000/#/login');
        browser.driver.findElement(protractor.By.id('userName')).sendKeys('admin');
        browser.driver.findElement(protractor.By.id('userPassword')).sendKeys('admin');

        ///Now click button and verify state afterwards
        browser.driver.findElement(protractor.By.id("signinButton")).click();
    });

    it('should be logged in', function() {
        expect(browser.driver.getCurrentUrl()).toBe('http://127.0.0.1:8000/#/projects');
    });
});
