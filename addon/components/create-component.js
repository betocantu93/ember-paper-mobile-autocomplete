import Component from '@ember/component';
import layout from '../templates/components/create-component';
import { inject as service } from '@ember/service';
import { getProperties, setProperties } from '@ember/object';

export default Component.extend({
  layout,
  store: service(),

  didInsertElement(){
    this._super(...arguments);
    setProperties(this, {
      name: null,
      email: null,
      phone: null
    });
  },
  actions: {
    addUser(){
      let { store, name, email, phone, modelName } = getProperties(this, 'store', 'name', 'email', 'phone', 'modelName');

      /*
      * Here you should validate and persist your model before
      * sending the action.
      * */

      // model.save().then((item) => {
      //   this.sendAction('onCreate', item);
      // });

      let item = store.createRecord(modelName, {
        name: name,
        email: email,
        phone: phone
      });

      this.sendAction('onCreate', item);
    }
  }
});
