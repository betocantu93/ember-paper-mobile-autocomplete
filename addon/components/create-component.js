import Component from '@ember/component';
import layout from '../templates/components/create-component';
import { inject as service } from '@ember/service';
import { getProperties } from '@ember/object';

export default Component.extend({
  layout,
  store: service(),

  actions: {
    addUser(){
      let {model} = getProperties(this, 'model');

      /*
      * Here you should validate and persist your model before
      * sending the action.
      * */

      // model.save().then((item) => {
      //   this.sendAction('onCreate', true, item);
      // });

      this.sendAction('onCreate', true, model);
    }
  }
});
