import { computed } from "mobx";

const { Menu, MenuItem } = EEZStudio.electron.remote;

import { Rect, Point, pointInRect, isRectInsideRect } from "eez-studio-shared/geometry";
import { beginTransaction, commitTransaction } from "eez-studio-shared/store";
import { humanize } from "eez-studio-shared/string";

import { extensionsToolbarButtons } from "eez-studio-shared/extensions/extensions";

import {
    IMenu,
    IMenuItem,
    IMenuPopupOptions,
    IMenuAnchorPosition
} from "eez-studio-shared/model/store";

import { IBaseObject, IDocument } from "eez-studio-designer/designer-interfaces";

import { store, workbenchObjects, deleteWorkbenchObject, WorkbenchObject } from "home/store";

////////////////////////////////////////////////////////////////////////////////

export interface IWorkbenchObject extends IBaseObject {
    oid: string;

    content: JSX.Element | null;
    details: JSX.Element | null;

    addToContextMenu?(menu: Electron.Menu): void;

    children: IBaseObject[];

    isEditable: boolean;
    openEditor?(target: "tab" | "window" | "default"): void;

    saveRect(): void;
}

////////////////////////////////////////////////////////////////////////////////

class WorkbenchDocument implements IDocument {
    @computed
    get objects() {
        return Array.from(workbenchObjects.values());
    }

    get rootObjects() {
        return this.objects;
    }

    findObjectById(id: string) {
        return this.objects.find(object => object.id === id);
    }

    findObjectParent(object: IBaseObject) {
        return undefined;
    }

    getObjectsInsideRect(rect: Rect) {
        return this.objects.filter(object => isRectInsideRect(object.boundingRect, rect));
    }

    deleteObjects(objects: IBaseObject[]) {
        if (objects.length > 0) {
            beginTransaction("Delete workbench items");
        } else {
            beginTransaction("Delete workbench item");
        }

        objects.forEach(object => deleteWorkbenchObject(object as WorkbenchObject));

        commitTransaction();
    }

    @computed
    get toolbarButtons() {
        return extensionsToolbarButtons.get();
    }

    createObject(params: any) {
        store.createObject(params);
    }

    objectFromPoint(point: Point) {
        let objects = this.objects;
        for (let i = objects.length - 1; i >= 0; i--) {
            let object = objects[i];
            if (pointInRect(point, object.rect)) {
                return object;
            }
        }

        return undefined;
    }

    onDragStart(op: "move" | "resize"): void {}

    onDragEnd(op: "move" | "resize", changed: boolean, objects: IWorkbenchObject[]): void {
        if (changed) {
            if (objects.length > 0) {
                beginTransaction(`${humanize(op)} workbench items`);
            } else {
                beginTransaction(`${humanize(op)} workbench item`);
            }

            for (let i = 0; i < objects.length; i++) {
                objects[i].saveRect();
            }

            commitTransaction();
        }
    }

    createContextMenu(objects: IWorkbenchObject[]): IMenu {
        const menu = new Menu();

        if (objects.length === 1) {
            const object = objects[0];

            if (object.addToContextMenu) {
                object.addToContextMenu(menu);
            }

            if (object.isEditable) {
                if (menu.items.length > 0) {
                    menu.append(
                        new MenuItem({
                            type: "separator"
                        })
                    );
                }

                menu.append(
                    new MenuItem({
                        label: "Open in Tab",
                        click: () => {
                            object.openEditor!("tab");
                        }
                    })
                );

                menu.append(
                    new MenuItem({
                        label: "Open in Window",
                        click: () => {
                            object.openEditor!("window");
                        }
                    })
                );
            }
        }

        if (objects.length > 0) {
            if (menu.items.length > 0) {
                menu.append(
                    new MenuItem({
                        type: "separator"
                    })
                );
            }

            menu.append(
                new MenuItem({
                    label: "Delete",
                    click: () => {
                        this.deleteObjects(objects);
                    }
                })
            );
        }

        return {
            append(menuItem: IMenuItem) {
                menu.append(new MenuItem(menuItem));
            },

            popup(options: IMenuPopupOptions, position: IMenuAnchorPosition) {
                menu.popup(options);
            }
        };
    }
}

////////////////////////////////////////////////////////////////////////////////

export const workbenchDocument = new WorkbenchDocument();
