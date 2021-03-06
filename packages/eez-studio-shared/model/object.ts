import React from "react";
import { observable } from "mobx";

import { _uniqWith } from "eez-studio-shared/algorithm";
import { humanize } from "eez-studio-shared/string";

import { loadObject, objectToJson } from "eez-studio-shared/model/serialization";
import { IContextMenuContext, IMenuItem } from "eez-studio-shared/model/store";

////////////////////////////////////////////////////////////////////////////////

export interface EnumItem {
    id: string | number;
    label?: string;
}

export enum PropertyType {
    String,
    MultilineText,
    JSON,
    JavaScript,
    CSS,
    Number,
    NumberArray,
    Array,
    Object,
    Enum,
    Image,
    Color,
    RelativeFolder,
    ObjectReference,
    ConfigurationReference,
    Boolean,
    GUID,
    Any
}

export enum MessageType {
    INFO,
    ERROR,
    WARNING
}

export interface IMessage {
    type: MessageType;
    text: string;
    object?: EezObject;
}

export interface IPropertyGridGroupDefinition {
    id: string;
    title?: string;
    menu?: (
        object: EezObject
    ) =>
        | {
              label: string;
              click: () => void;
          }[]
        | undefined;
    position?: 0;
}

export const generalGroup: IPropertyGridGroupDefinition = {
    id: "general",
    position: 0
};

export const geometryGroup: IPropertyGridGroupDefinition = {
    id: "geometry",
    title: "Position and size"
};

export const styleGroup: IPropertyGridGroupDefinition = {
    id: "style",
    title: "Style"
};

export const dataGroup: IPropertyGridGroupDefinition = {
    id: "data"
};

export const actionsGroup: IPropertyGridGroupDefinition = {
    id: "actions"
};

export interface PropertyInfo {
    name: string;
    type: PropertyType;

    // optional properties
    displayName?: string;
    enumItems?: EnumItem[];
    typeClass?: EezClass;
    referencedObjectCollectionPath?: string[];
    matchObjectReference?: (object: EezObject, path: (string | number)[], value: string) => boolean;
    replaceObjectReference?: (value: string) => string;
    computed?: boolean;
    onSelect?: (object: EezObject, propertyInfo: PropertyInfo) => Promise<any>;
    hideInPropertyGrid?: boolean | ((object: EezObject, propertyInfo: PropertyInfo) => boolean);
    readOnlyInPropertyGrid?: boolean;
    propertyGridGroup?: IPropertyGridGroupDefinition;
    propertyGridComponent?: typeof React.Component;
    propertyGridCollapsable?: boolean;
    enumerable?: boolean | ((object: EezObject, propertyInfo: PropertyInfo) => boolean);
    showOnlyChildrenInTree?: boolean;
    isOptional?: boolean;
    defaultValue?: any;
    inheritable?: boolean;
    unique?: boolean;
    skipSearch?: boolean;
    childLabel?: (childObject: EezObject, childLabel: string) => string;
    check?: (object: EezObject) => IMessage[];
    interceptAddObject?: (parentObject: EezObject, object: EezObject) => EezObject;
    downloadFileName?: (object: EezObject, propertyInfo: PropertyInfo) => string;
    resolutionDependable?: boolean;
}

export interface NavigationComponentProps {
    id: string;
    navigationObject: EezObject;
    content: JSX.Element;
}

export class NavigationComponent extends React.Component<NavigationComponentProps, {}> {}

export interface IEditorState {
    loadState(state: any): void;
    saveState(): any;
    selectObject(object: EezObject): void;
}

export interface IEditor {
    object: EezObject;
    state: IEditorState | undefined;
}

export interface EditorComponentProps {
    editor: IEditor;
}

export class EditorComponent extends React.Component<EditorComponentProps, {}> {}

export type InheritedValue =
    | {
          value: any;
          source: EezObject;
      }
    | undefined;

export interface ClassInfo {
    properties: PropertyInfo[];

    // optional properties
    getClass?: (jsObject: any, aClass: EezClass) => any;
    label?: (object: EezObject) => string;
    listLabel?: (object: EezObject) => JSX.Element | string;

    parentClassInfo?: ClassInfo;

    showInNavigation?: boolean;
    hideInProperties?: boolean;
    isPropertyMenuSupported?: boolean;
    navigationComponent?: typeof NavigationComponent | null;
    navigationComponentId?: string;
    defaultNavigationKey?: string;

    editorComponent?: typeof EditorComponent;
    isEditorSupported?: (object: EezObject) => boolean;

    createEditorState?: (object: EezObject) => IEditorState;
    newItem?: (object: EezObject) => Promise<any>;
    getInheritedValue?: (object: EezObject, propertyName: string) => InheritedValue;
    defaultValue?: any;
    findPastePlaceInside?: (
        object: EezObject,
        classInfo: ClassInfo,
        isSingleObject: boolean
    ) => EezObject | PropertyInfo | undefined;
    icon?: string;

    propertyGridTableComponent?: any;

    beforeLoadHook?(object: EezObject, jsObject: any): void;

    updateObjectValueHook?: (
        object: EezObject,
        propertyName: string,
        value: any
    ) =>
        | {
              oldValue: any;
              newValue: any;
          }
        | undefined;

    afterUpdateObjectHook?: (object: EezObject, changedProperties: any, oldValues: any) => void;

    creatableFromPalette?: boolean;
}

export function makeDerivedClassInfo(
    baseClassInfo: ClassInfo,
    derivedClassInfoProperties: Partial<ClassInfo>
): ClassInfo {
    if (derivedClassInfoProperties.properties) {
        const b = baseClassInfo.properties; // base class properties
        const d = derivedClassInfoProperties.properties; // derived class properties
        const r = []; // resulting properties

        // put base and overriden properties into resulting properties array
        for (let i = 0; i < b.length; ++i) {
            let j;
            for (j = 0; j < d.length; ++j) {
                if (b[i].name === d[j].name) {
                    break;
                }
            }
            r.push(j < d.length ? d[j] /* overriden */ : b[i] /* base */);
        }

        // put derived (not overriden) properties into resulting array
        for (let i = 0; i < d.length; ++i) {
            let j;
            for (j = 0; j < r.length; ++j) {
                if (d[i].name === r[j].name) {
                    break;
                }
            }
            if (j === r.length) {
                r.push(d[i]);
            }
        }

        derivedClassInfoProperties.properties = r;
    }

    const baseBeforeLoadHook = baseClassInfo.beforeLoadHook;
    const derivedBeforeLoadHook = derivedClassInfoProperties.beforeLoadHook;
    if (baseBeforeLoadHook && derivedBeforeLoadHook) {
        derivedClassInfoProperties.beforeLoadHook = (object: EezObject, jsObject: any) => {
            baseBeforeLoadHook(object, jsObject);
            derivedBeforeLoadHook(object, jsObject);
        };
    }

    const derivedClassInfo = Object.assign({}, baseClassInfo, derivedClassInfoProperties);
    derivedClassInfo.parentClassInfo = baseClassInfo;
    return derivedClassInfo;
}

////////////////////////////////////////////////////////////////////////////////

export class EezObject {
    _id: string;
    _key?: string;
    _parent?: EezObject;
    _lastChildId?: number;
    @observable _modificationTime?: number;
    _propertyInfo?: PropertyInfo;

    static classInfo: ClassInfo;

    get _class() {
        return this.constructor as EezClass;
    }

    get _classInfo(): ClassInfo {
        return this._class.classInfo;
    }

    get _label(): string {
        if (this._classInfo.label) {
            return this._classInfo.label(this);
        }

        let name = (this as any).name;
        if (name) {
            return name;
        }

        return this._id;
    }

    get editorComponent(): typeof EditorComponent | undefined {
        if (this._classInfo.isEditorSupported && !this._classInfo.isEditorSupported(this)) {
            return undefined;
        }
        return this._classInfo.editorComponent;
    }

    extendContextMenu(
        context: IContextMenuContext,
        objects: EezObject[],
        menuItems: IMenuItem[]
    ): void {}
}

export class EezArrayObject<T> extends EezObject {
    @observable _array: T[] = [];

    constructor(array?: T[]) {
        super();
        if (array) {
            this._array = array;
        }
    }

    get _class() {
        return this._propertyInfo!.typeClass!;
    }
}

////////////////////////////////////////////////////////////////////////////////

export type EezClass = typeof EezObject;

let classes = new Map<string, EezClass>();

export function registerClass(aClass: EezClass) {
    classes.set(aClass.name, aClass);
}

////////////////////////////////////////////////////////////////////////////////

export class EezValueObject extends EezObject {
    public propertyInfo: PropertyInfo;
    public value: any;

    static create(object: EezObject, propertyInfo: PropertyInfo, value: any) {
        const valueObject = new EezValueObject();

        valueObject._id = object._id + "." + propertyInfo.name;
        valueObject._key = propertyInfo.name;
        valueObject._parent = object;

        valueObject.propertyInfo = propertyInfo;
        valueObject.value = value;

        return valueObject;
    }

    static classInfo: ClassInfo = {
        label: (object: EezValueObject) => {
            return object.value && object.value.toString();
        },
        properties: []
    };
}

registerClass(EezValueObject);

////////////////////////////////////////////////////////////////////////////////

export class EezBrowsableObject extends EezObject {
    propertyInfo: any;
    value: any;

    static classInfo: ClassInfo = {
        label: (object: EezBrowsableObject) => object.propertyInfo.name,
        properties: []
    };

    static create(object: EezObject, propertyInfo: PropertyInfo, value: any) {
        const browsableObject = new EezBrowsableObject();

        browsableObject._id = object._id + "." + propertyInfo.name;
        browsableObject._key = propertyInfo.name;
        browsableObject._parent = object;

        browsableObject.propertyInfo = propertyInfo;
        browsableObject.value = value;

        return browsableObject;
    }
}

////////////////////////////////////////////////////////////////////////////////

export function findClass(className: string) {
    return classes.get(className);
}

export function getClassesDerivedFrom(parentClass: EezClass) {
    const derivedClasses = [];
    for (const aClass of classes.values()) {
        if (isProperSubclassOf(aClass.classInfo, parentClass.classInfo)) {
            derivedClasses.push(aClass);
        }
    }
    return derivedClasses;
}

export function isSubclassOf(classInfo: ClassInfo | undefined, baseClassInfo: ClassInfo) {
    while (classInfo) {
        if (classInfo === baseClassInfo) {
            return true;
        }
        classInfo = classInfo.parentClassInfo;
    }
    return false;
}

export function isProperSubclassOf(classInfo: ClassInfo | undefined, baseClassInfo: ClassInfo) {
    if (classInfo) {
        while (true) {
            classInfo = classInfo.parentClassInfo;
            if (!classInfo) {
                return false;
            }
            if (classInfo === baseClassInfo) {
                return true;
            }
        }
    }
    return false;
}

export function isObjectInstanceOf(object: EezObject, baseClassInfo: ClassInfo) {
    return isSubclassOf(object._classInfo, baseClassInfo);
}

export function isSameInstanceTypeAs(object1: EezObject, object2: EezObject) {
    if (!object1 || !object2) {
        return false;
    }
    return object1._classInfo === object2._classInfo;
}

export function isEqual(object1: EezObject, object2: EezObject) {
    if (isValue(object1)) {
        if (!isValue(object1)) {
            return false;
        }
        return object1._parent == object2._parent && object1._key == object2._key;
    } else {
        if (isValue(object1)) {
            return false;
        }
        return object1 == object2;
    }
}

export function isValue(object: EezObject | undefined) {
    return !!object && object instanceof EezValueObject;
}

export function isObject(object: EezObject | undefined) {
    return !!object && !isValue(object) && !isArray(object);
}

export function isArray(object: EezObject | undefined) {
    return !!object && !isValue(object) && object instanceof EezArrayObject;
}

export function asArray<T = EezObject>(object: EezObject) {
    return object && ((object as EezArrayObject<T>)._array as T[]);
}

export function getChildren(parent: EezObject): EezObject[] {
    if (isArray(parent)) {
        return asArray(parent);
    } else {
        let properties = parent._classInfo.properties.filter(
            propertyInfo =>
                (propertyInfo.type === PropertyType.Object ||
                    propertyInfo.type === PropertyType.Array) &&
                isPropertyEnumerable(parent, propertyInfo) &&
                getProperty(parent, propertyInfo.name)
        );

        if (
            properties.length == 1 &&
            properties[0].type === PropertyType.Array &&
            !(properties[0].showOnlyChildrenInTree === false)
        ) {
            return asArray(getProperty(parent, properties[0].name));
        }

        return properties.map(propertyInfo => getProperty(parent, propertyInfo.name));
    }
}

export function isAncestor(object: EezObject, ancestor: EezObject): boolean {
    if (object == undefined || ancestor == undefined) {
        return false;
    }

    if (object == ancestor) {
        return true;
    }

    let parent = object._parent;
    return !!parent && isAncestor(parent, ancestor);
}

export function isProperAncestor(object: EezObject, ancestor: EezObject) {
    if (object == undefined || object == ancestor) {
        return false;
    }

    let parent = object._parent;
    return !!parent && isAncestor(parent, ancestor);
}

function uniqueTop(objects: EezObject[]): EezObject[] {
    return _uniqWith(objects, (a: EezObject, b: EezObject) => isAncestor(a, b) || isAncestor(b, a));
}

function getParents(objects: EezObject[]): EezObject[] {
    return uniqueTop(objects
        .map(object => object._parent)
        .filter(object => !!object) as EezObject[]);
}

export function reduceUntilCommonParent(objects: EezObject[]): EezObject[] {
    let uniqueTopObjects = uniqueTop(objects);

    let parents = getParents(uniqueTopObjects);

    if (parents.length == 1) {
        return uniqueTopObjects;
    }

    if (parents.length > 1) {
        return reduceUntilCommonParent(parents);
    }

    return [];
}

export function isArrayElement(object: EezObject) {
    return object._parent instanceof EezArrayObject;
}

export function findPropertyByName(object: EezObject, propertyName: string) {
    return object._classInfo.properties.find(propertyInfo => propertyInfo.name == propertyName);
}

export function findPropertyByChildObject(object: EezObject, childObject: EezObject) {
    return object._classInfo.properties.find(
        propertyInfo => getProperty(object, propertyInfo.name) === childObject
    );
}

export function getInheritedValue(object: EezObject, propertyName: string) {
    const getInheritedValue = object._classInfo.getInheritedValue;
    if (getInheritedValue) {
        return getInheritedValue(object, propertyName);
    }
    return undefined;
}

export function isPropertyHidden(object: EezObject, propertyInfo: PropertyInfo) {
    if (propertyInfo.hideInPropertyGrid === undefined) {
        return false;
    }

    if (typeof propertyInfo.hideInPropertyGrid === "boolean") {
        return propertyInfo.hideInPropertyGrid;
    }

    return propertyInfo.hideInPropertyGrid(object, propertyInfo);
}

export function isPropertyEnumerable(object: EezObject, propertyInfo: PropertyInfo) {
    if (propertyInfo.enumerable === undefined) {
        return true;
    }

    if (typeof propertyInfo.enumerable === "boolean") {
        return propertyInfo.enumerable;
    }

    return propertyInfo.enumerable(object, propertyInfo);
}

export function getProperty(object: EezObject, name: string) {
    return (object as any)[name];
}

export function getPropertyAsString(object: EezObject, propertyInfo: PropertyInfo) {
    let value = getProperty(object, propertyInfo.name);
    if (typeof value === "number") {
        return value.toString();
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof EezArrayObject) {
        return (value as EezArrayObject<EezObject>)._array.map(object => object._label).join(", ");
    }
    if (value instanceof EezObject) {
        return objectToString(value);
    }
    return "";
}

export function humanizePropertyName(object: EezObject, propertyName: string) {
    const property = findPropertyByName(object, propertyName);
    if (property && property.displayName) {
        return property.displayName;
    }
    return humanize(propertyName);
}

export function objectToString(object: EezObject) {
    let label: string;

    if (isValue(object)) {
        label = getProperty(object._parent!, object._key!);
    } else if (isArray(object)) {
        let propertyInfo = findPropertyByName(object._parent!, object._key!);
        label = (propertyInfo && propertyInfo.displayName) || humanize(object._key);
    } else {
        label = object._label;
    }

    if (
        object &&
        object._parent &&
        object._parent instanceof EezArrayObject &&
        object._parent!._parent &&
        object._parent!._key
    ) {
        let propertyInfo = findPropertyByName(object._parent!._parent!, object._parent!._key!);
        if (propertyInfo && propertyInfo.childLabel) {
            label = propertyInfo.childLabel(object, label);
        }
    }

    return label;
}

export function getChildOfObject(
    object: EezObject,
    key: PropertyInfo | string | number
): EezObject | undefined {
    let propertyInfo: PropertyInfo | undefined;

    if (isArray(object)) {
        let elementIndex: number | undefined = undefined;

        if (typeof key == "string") {
            elementIndex = parseInt(key);
        } else if (typeof key == "number") {
            elementIndex = key;
        }

        const array = asArray(object);

        if (elementIndex !== undefined && elementIndex >= 0 && elementIndex < array.length) {
            return array[elementIndex];
        } else {
            console.error("invalid array index");
        }
    } else {
        if (typeof key == "string") {
            propertyInfo = findPropertyByName(object, key);
        } else if (typeof key == "number") {
            console.error("invalid key type");
        } else {
            propertyInfo = key;
        }
    }

    if (propertyInfo) {
        let childObjectOrValue = getProperty(object, propertyInfo.name);
        if (propertyInfo.typeClass) {
            return childObjectOrValue;
        } else {
            return EezValueObject.create(object, propertyInfo, childObjectOrValue);
        }
    }

    return undefined;
}

export function getAncestorOfType(object: EezObject, classInfo: ClassInfo): EezObject | undefined {
    if (object) {
        if (isObjectInstanceOf(object, classInfo)) {
            return object;
        }
        return object._parent && getAncestorOfType(object._parent!, classInfo);
    }
    return undefined;
}

export function getObjectPath(object: EezObject): (string | number)[] {
    let parent = object._parent;
    if (parent) {
        if (isArrayElement(object)) {
            return getObjectPath(parent).concat(asArray(parent).indexOf(object as EezObject));
        } else {
            return getObjectPath(parent).concat(object._key as string);
        }
    }
    return [];
}

export function getObjectPropertyAsObject(object: EezObject, propertyInfo: PropertyInfo) {
    return getChildOfObject(object, propertyInfo) as EezValueObject;
}

export function getRootObject(object: EezObject) {
    while (object._parent) {
        object = object._parent;
    }
    return object;
}

// Get object ancestors as array,
// from the root object up to the given object (including given object)
export function getAncestors(
    object: EezObject,
    ancestor?: EezObject,
    showSingleArrayChild?: boolean
): EezObject[] {
    if (!ancestor) {
        return getAncestors(object, getRootObject(object));
    }

    if (isValue(object)) {
        object = object._parent!;
    }

    if (isArray(ancestor)) {
        let possibleAncestor = asArray(ancestor).find(
            possibleAncestor =>
                object == possibleAncestor || object._id.startsWith(possibleAncestor._id + ".")
        );
        if (possibleAncestor) {
            if (possibleAncestor == object) {
                if (showSingleArrayChild) {
                    return [ancestor, object];
                } else {
                    return [object];
                }
            } else {
                if (showSingleArrayChild) {
                    return [ancestor as EezObject].concat(getAncestors(object, possibleAncestor));
                } else {
                    return getAncestors(object, possibleAncestor);
                }
            }
        }
    } else {
        let numObjectOrArrayProperties = 0;
        for (const propertyInfo of ancestor._classInfo.properties) {
            if (
                propertyInfo.type === PropertyType.Object ||
                propertyInfo.type === PropertyType.Array
            ) {
                numObjectOrArrayProperties++;
            }
        }

        if (numObjectOrArrayProperties > 0) {
            for (const propertyInfo of ancestor._classInfo.properties) {
                if (
                    propertyInfo.type === PropertyType.Object ||
                    propertyInfo.type === PropertyType.Array
                ) {
                    let possibleAncestor: EezObject = (ancestor as any)[propertyInfo.name];

                    if (possibleAncestor === object) {
                        return [ancestor];
                    }

                    if (possibleAncestor && object._id.startsWith(possibleAncestor._id + ".")) {
                        return [ancestor].concat(
                            getAncestors(object, possibleAncestor, numObjectOrArrayProperties > 1)
                        );
                    }
                }
            }
        }
    }
    return [];
}

export function getHumanReadableObjectPath(object: EezObject) {
    let ancestors = getAncestors(object);
    return ancestors
        .slice(1)
        .map(object => objectToString(object))
        .join(" / ");
}

export function getObjectPathAsString(object: EezObject) {
    return "/" + getObjectPath(object).join("/");
}

export function isObjectExists(object: EezObject) {
    let parent = object._parent;
    if (parent) {
        if (isArray(parent)) {
            if (asArray(parent).indexOf(object) === -1) {
                return false;
            }
        } else {
            const key = object._key;
            if (key && (parent as any)[key] !== object) {
                return false;
            }
        }
    }
    return true;
}

export function getObjectFromPath(rootObject: EezObject, path: string[]) {
    let object = rootObject;

    for (let i = 0; i < path.length && object; i++) {
        object = getChildOfObject(object, path[i]) as EezObject;
    }

    return object;
}

export function getObjectFromStringPath(rootObject: EezObject, stringPath: string) {
    if (stringPath == "/") {
        return rootObject;
    }
    return getObjectFromPath(rootObject, stringPath.split("/").slice(1));
}

export function getObjectFromObjectId(
    rootObject: EezObject,
    objectID: string
): EezObject | undefined {
    function getDescendantObjectFromId(object: EezObject, id: string): EezObject | undefined {
        if (object._id == id) {
            return object;
        }

        if (isArray(object)) {
            let childObject = asArray(object).find(
                child => id == child._id || id.startsWith(child._id + ".")
            );
            if (childObject) {
                if (childObject._id == id) {
                    return childObject;
                }
                return getDescendantObjectFromId(childObject, id);
            }
        } else {
            for (const propertyInfo of object._classInfo.properties) {
                if (
                    propertyInfo.type === PropertyType.Object ||
                    propertyInfo.type === PropertyType.Array
                ) {
                    let childObject = getChildOfObject(object, propertyInfo);
                    if (childObject) {
                        if (childObject._id == id) {
                            return childObject;
                        }
                        if (id.startsWith(childObject._id + ".")) {
                            return getDescendantObjectFromId(childObject, id);
                        }
                    }
                }
            }
        }

        return undefined;
    }

    return getDescendantObjectFromId(rootObject, objectID as string);
}

export function cloneObject(parent: EezObject | undefined, obj: EezObject) {
    return loadObject(parent, objectToJson(obj), obj._class);
}

export function checkObject(object: EezObject): IMessage[] {
    if (isArray(object)) {
        const check = object._propertyInfo!.check;
        if (check) {
            return check(object);
        }
    } else {
        if ((object as any).check) {
            return (object as any).check();
        }
    }
    return [];
}

export function hidePropertiesInPropertyGrid(
    aClass: EezClass,
    properties: string[],
    callback?: (object: EezObject, propertyInfo: PropertyInfo) => boolean
) {
    aClass.classInfo.properties.forEach(propertyInfo => {
        if (properties.indexOf(propertyInfo.name) !== -1) {
            propertyInfo.hideInPropertyGrid = callback || true;
        }
    });
}

export function isShowOnlyChildrenInTree(object: EezObject) {
    if (!object._parent || !object._key) {
        return true;
    }

    const propertyInfo = findPropertyByName(object._parent, object._key);
    if (!propertyInfo) {
        return true;
    }

    return !(propertyInfo.showOnlyChildrenInTree === false);
}

export function areAllChildrenOfTheSameParent(objects: EezObject[]) {
    for (let i = 1; i < objects.length; i++) {
        if (objects[i]._parent !== objects[0]._parent) {
            return false;
        }
    }
    return true;
}
