import Component from '@ember/component';
import { get, set, getProperties, setProperties } from '@ember/object';
import { isBlank } from '@ember/utils';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import { next } from '@ember/runloop';
import { A } from '@ember/array';
import { assert } from '@ember/debug';

const DEBOUNCE_MS = 250;

export default Component.extend({

  store: service(),

  classNames: ['mobile-autocomplete'],
  tagName: 'div',

  /*
  * Presentation
  * */

  fullscreen: true,
  doneLabel: 'DONE',

  /*
  * This is the main property of this component, since we will be filtering and creating around this model
  * */
  modelName: null,

  /*
  * if the modal will have a component for creation
  * you must provide a component name to render inside the create component dialog,
  * if showCreateModal is activated, a new record of the modelName is created and passed to the
  * createComponentName component, so you can easily work with that model in your hbs and js
  * */
  create: false,
  createComponentName: 'create-component',
  createMessage: 'Please provide a text in createMessage',
  newItem: null,

  /* private filters for remote */
  _filters:{},

  /*Properties for remote filtering */
  remoteFilters: {},
  remoteSearchTextProperty: 'name',

  //If radio, check if auto send close action
  closeOnSelect: false,

  /*
    Only filter peekAll records using the filterFunc
  */
  filterLocal: false,

  /*Avoids blank dialog at start if any record is returned by peekAll with filterFunc applied*/
  preload: false,

  /*
    Component view state
  */
  showCreateModal: false,
  showCreateComponent: false,
  isLoading: false,
  hasLoaded: false,
  showDone: true,

  /*
    radio:
      selectedItems array will always have only one object
    checkbox:
      selectedItems will keep growing as the user selects more items
  */
  type: 'radio',

  /* List of item currently being rendered */
  items: A([]),

  /*
    Array of selectedItems
  */
  selectedItems: A([]),

  /* Simple backup of what the store currently has of this model */
  localItems: A([]),

  /*
    Function to filter subsequent local records
    you need to provide yours.

    @param  model  item  Current model record
    @param  array  items  Array of models
    @param  string  searchText  Search Term

  */
  filterFunc: (item, items, searchText) => {
    return true;
  },

  /*
    Function for preliminary filter this model in the store,
    useful if you want to work with a subset of records,
    for example, all users with scope 5.

    you need to provide yours.

    @param  model  item  Current model record
    @param  array  items  Array of models

  */
  preliminaryFilterFunc: (item, items) => {
    return true;
  },

  /*
  * Every time the selectedItems array changes by user interaction,
  * this function will be called with the new array
  * */
  onChange(selectedItems){},
  /*
  * Handle error if remote query fails
  * */
  onError(json){},

  /* Validations and preloading items */
  didInsertElement(){

    this._super(...arguments);
    assert('You must provide a modelName to the ember-paper-mobile-autocomplete component', !isBlank(get(this, 'modelName')));

    let { onClose, create, createComponentName } = getProperties(this, 'onClose', 'create', 'createComponentName');

    assert('You must provide a onClose function to ember-paper-mobile-autocomplete', !isBlank(onClose));

    assert('You must provide a createComponentName to ember-paper-mobile-autocomplete if you want to create models', !(create && isBlank(createComponentName)));

    if(get(this, 'preload') || get(this, 'filterLocal')){
      this._loadLocal();
    }

  },


  /*

    store.peekAll model filtered by filterFunc.
    if it's radio type, removes from the items the only one at selectedItems, because it will be shown highlighted
    at the top of the list

  */

  _loadLocal(){

    let {
      modelName,
      type,
      store,
      selectedItems
    } = getProperties(this, 'modelName', 'type', 'store', 'selectedItems');

    let items = store.peekAll(modelName);

    let localItems = items.filter( (item) => {
      return get(this, 'preliminaryFilterFunc')(item, items);
    });

    set(this, 'localItems', localItems);

    let uniq;

    if(type === 'radio'){
      uniq = localItems.filter((item) => {
        return !selectedItems.any((i) => {
          return i.id === item.id
        });
      });
      set(this, 'hasLoaded', true);
    } else {
      uniq = get(this, 'localItems');
    }

    set(this, 'items', uniq);


  },

  actions: {

    /* Do something onClose */
    back(){
      this.sendAction('onClose');
    },

    /*
      When an item is created, it's added to selectedItems
      if there is filterLocal, this new item is added to the localItems so we can
      keep filtering the local updated store, and also onCreate action is bubbled with (created, item) params,
      you must bubble onCreate with true/false and with the newly created item
    */

    onCreate(created, item){
      setProperties(this, {
        showCreateModal: false,
        showCreateComponent: false
      });
      if(created){
        this.send('selectItem', item);

        if(get(this, 'filterLocal')){
          get(this, 'localItems').pushObject(item);
          this._loadLocal();
        }

      }
      this.sendAction('onCreate', ...arguments);
    },

    //show / hide create modal
    changeShowCreate(flag){

      let { store, modelName } = getProperties(this, 'store', 'modelName');
      let newItem;

      if(flag){
        newItem = store.createRecord(modelName);
      }

      next(() => {
        setProperties(this, {
          showCreateModal: flag,
          showCreateComponent: flag,
          newItem: newItem
        });
      })

    },

    /* Clear the searchText and shows Done button */
    clearSearchText(){
      setProperties(this, {
        searchText: null,
        showDone: false,
      });
      next(() => {
        set(this, 'showDone', true);
      });
    },

    /* Cancel all running tasks and sends onClose action */
    done(){
      let showCreateModal = get(this, 'showCreateModal');
      get(this, 'searchLocalModel').cancelAll();
      get(this, 'searchRemoteModel').cancelAll();
      if(!showCreateModal){
        this.sendAction('onClose');
      }
    },

    /* Removes the item from the selectedItems array, and reloads localItems via _loadLocal
     * onChange function is also called
     */
    delete(item){

      let selectedItems = get(this, 'selectedItems').without(item);
      set(this, 'selectedItems', selectedItems);

      if(get(this, 'filterLocal')){
        this._loadLocal();
      }

      this.sendAction('onChange', selectedItems);

    },
    /*
    * Handles the input in the search text and performs
    * the appropriate search function local or remote
    * */
    handleInput(e){

      set(this, 'searchText', e.target.value);

      if(get(this, 'filterLocal')){
        get(this, 'searchLocalModel').perform(get(this, 'searchText'));
      } else {
        get(this, 'searchRemoteModel').perform(get(this, 'searchText'));
      }

    },

    /*
    * Function to mimic the behavior of the current type radio or checkbox
    *
    * If its radio, it replaces selectedItems with a new with only one record at the first position a[0]
    *
    * If its checkbox, it just append the item to the current selectedItems array
    *
    * */
    selectItem(item) {

      let { showCreateModal, type, closeOnSelect } = getProperties(this, 'showCreateModal', 'type', 'closeOnSelect');
      let selectedItems;

      if(!showCreateModal){

        switch(type){
          //If its radio type, always replace array with this new item
          case 'radio':
            selectedItems = A([item]);

            setProperties(this, {
              selectedItems: selectedItems,
              items: null,
              searchText: null
            });

            break;
          //If layout equals checkbox act as an array with index.
          case 'checkbox':

            get(this, 'selectedItems').pushObject(item);

            selectedItems = get(this, 'selectedItems').uniqBy('id');

            set(this, 'selectedItems', selectedItems);

            break;
          //If not type is specified, act as radio
          default:
            selectedItems = set(this, 'selectedItems', A([item]));
            break;

        }

        get(this, 'onChange')(selectedItems);

        if(type === 'radio' && closeOnSelect){
          this.sendAction('onClose');
        }

      }

    },
  },

  /*
  * Filters localItems with filterFunc(item, items, searchText)
  *
  * Easy filterFunc implementation example for local filtering by item name, you can append
  * to the itemName other properties so the function
    may find user Alberto Cantu when searching for example cantu male

    term = term.normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().split(/\ +/);

    let itemName = get(item, 'name').normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().split(/\ +/);

    let found = term.every((searchWord) => {
      return itemName.some((itemWord) => {
        return itemWord.search(searchWord)>-1;
      });
    });

  */
  searchLocalModel: task(function* (term) {

    let { lastSearchText, type, localItems, filterFunc } = getProperties(this, 'lastSearchText', 'type', 'localItems', 'filterFunc');

    if(term === lastSearchText){
      return;
    }

    let filteredItems;

    if(!isBlank(term)){

      yield timeout(DEBOUNCE_MS);

      filteredItems = localItems.filter((item) => {

        let found = filterFunc(item, localItems, term);

        //Include all results if its type checkbox.
        if(type === 'checkbox'){
          return found;
        }

        //Exclude this item if it's already in selectedItems and its radio type
        return found && !get(this, 'selectedItems').any((i) => {
          return i.id === item.id
        });

      });

      set(this, 'items', filteredItems);

    } else {

      let uniq;
      //Include all results if its type checkbox.
      if(type === 'checkbox'){
        uniq = get(this, 'localItems');
      } else {
        //Exclude already selected items if its type radio.
        uniq = get(this, 'localItems').filter((item) => {
          return !get(this, 'selectedItems').any((i) => {
            return i.id === item.id
          });
        });
      }

      set(this, 'items', uniq);
      set(this, 'isLoading', false);
    }

  }).restartable(),


  /*
  * Function that sends a query using modelName property,
  * the term could be sent via remoteSearchTextProperty and extra filters via remoteFilters property
  * with this structure
  * let remoteFilters: {
  *   page: 1,
  *   size: 10
  * }
  * */

  searchRemoteModel: task(function* (term) {

    let {
      lastSearchText,
      searchText,
      modelName,
      store,
      _filters,
      remoteSearchTextProperty,
      remoteFilters,
      selectedItems
    } = getProperties(this, 'lastSearchText', 'searchText', 'modelName', 'store', '_filters', 'remoteSearchTextProperty', 'remoteFilters', 'selectedItems');

    if( term === lastSearchText ){
      return;
    }


    set(this, 'lastSearchText', term);

    yield timeout(DEBOUNCE_MS);

    if(!isBlank(term)){

      term = term.trim();

      set(this, 'isLoading', true);

      return store.query(modelName, {
        filter: Object.assign(_filters, {[remoteSearchTextProperty]: term, remoteFilters})
      }).then((items) => {

        /*
          Exclude from items returned by the query the ones in selectedItems
          this is merely ux perception trying to mimic google calendar people picker
        * */
        if(searchText){

          let uniq = items.filter((item) => {
            return !selectedItems.any((i) => {
              return i.id === item.id
            });
          });

          set(this, 'items', uniq);

        } else {

          set(this, 'items', null);

        }

        setProperties(this, {
          isLoading: false,
          hasLoaded: true
        });

      }).catch((json) => {

        set(this, 'isLoading', false);

        this.sendAction('onError', json);

      });

    } else {

      setProperties(this, {
        items: A([]),
        isLoading: false
      });

    }

  }).restartable(),

});
