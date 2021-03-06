import React from "react";
import { observable, computed, action } from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";
import { bind } from "bind-decorator";

import { formatBytes } from "eez-studio-shared/formatBytes";
import { guid } from "eez-studio-shared/guid";
import { capitalize } from "eez-studio-shared/string";

import { ListContainer, List, IListNode } from "eez-studio-ui/list";

@observer
export class PropertyEnclosure extends React.Component<
    {
        advanced: boolean; // show this property in "Advanced properties" section
        errors?: string[];
        style?: React.CSSProperties;
        className?: string;
        title?: string;
    },
    {}
> {
    render() {
        let className = classNames(this.props.className, {
            advanced: this.props.errors ? false : this.props.advanced
        });

        let result = (
            <tr key="property" className={className} style={this.props.style}>
                {this.props.children}
            </tr>
        );

        if (!this.props.errors) {
            return result;
        }

        return [
            result,
            <tr key="error">
                <td />
                <td>
                    {this.props.errors.map(error => (
                        <div className="text-danger" key={error}>
                            {error}
                        </div>
                    ))}
                </td>
            </tr>
        ];
    }
}

@observer
export class StaticProperty extends React.Component<
    {
        name: string;
        value: string;
        advanced?: boolean;
    },
    {}
> {
    render() {
        return (
            <PropertyEnclosure advanced={this.props.advanced || false}>
                <td className="PropertyName">{this.props.name}</td>
                <td className="StaticPropertyValue">
                    {(this.props.value && this.props.value.toString()) || ""}
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class BytesProperty extends React.Component<
    {
        name: string;
        value: number;
        advanced?: boolean;
    },
    {}
> {
    render() {
        return (
            <PropertyEnclosure advanced={this.props.advanced || false}>
                <td className="PropertyName">{this.props.name}</td>
                <td className="StaticPropertyValue">{formatBytes(this.props.value)}</td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class InputProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: any;
        suggestions?: string[];
        title?: string;
        onChange: (value: any) => void;
        advanced?: boolean;
        type: string;
        errors?: string[];
        min?: number;
        max?: number;
    },
    {}
> {
    render() {
        let id = this.props.id || guid();

        let input = (
            <input
                id={id}
                className="form-control"
                type={this.props.type}
                value={this.props.value}
                title={this.props.title}
                onChange={event => this.props.onChange(event.target.value)}
                min={this.props.min}
                max={this.props.max}
            />
        );

        if (this.props.suggestions && this.props.suggestions.length > 0) {
            input = (
                <div className="input-group">
                    {input}
                    <div className="input-group-append">
                        <div className="dropdown">
                            <button
                                className="btn btn-secondary dropdown-toggle"
                                type="button"
                                data-toggle="dropdown"
                            />
                            <div className="dropdown-menu">
                                {this.props.suggestions.map(suggestion => (
                                    <button
                                        key={suggestion}
                                        className="dropdown-item"
                                        type="button"
                                        onClick={() => this.props.onChange(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        let content;
        if (this.props.name) {
            content = [
                <td key="name">
                    <label
                        className="PropertyName col-form-label"
                        htmlFor={id}
                        title={this.props.title}
                    >
                        {this.props.name}
                    </label>
                </td>,

                <td key="value">{input}</td>
            ];
        } else {
            content = <td colSpan={2}>{input}</td>;
        }

        return (
            <PropertyEnclosure
                advanced={this.props.advanced || false}
                errors={this.props.errors}
                title={this.props.title}
            >
                {content}
            </PropertyEnclosure>
        );
    }
}

@observer
export class TextInputProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: string;
        suggestions?: string[];
        title?: string;
        onChange: (value: string) => void;
        advanced?: boolean;
        errors?: string[];
    },
    {}
> {
    render() {
        return <InputProperty {...this.props} type="text" />;
    }
}

@observer
export class MultilineTextInputProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: any;
        onChange: (value: any) => void;
        advanced?: boolean;
        errors?: string[];
        rows: number;
        readOnly?: boolean;
    },
    {}
> {
    render() {
        let id = this.props.id || guid();

        let input = (
            <textarea
                id={id}
                className="form-control"
                rows={this.props.rows}
                value={this.props.value}
                onChange={event => this.props.onChange(event.target.value)}
                readOnly={this.props.readOnly}
            />
        );

        let content;
        if (this.props.name) {
            content = [
                <td key="name" style={{ verticalAlign: "baseline" }}>
                    <label className="PropertyName col-form-label" htmlFor={id}>
                        {this.props.name}
                    </label>
                </td>,

                <td key="value">{input}</td>
            ];
        } else {
            content = <td colSpan={2}>{input}</td>;
        }

        return (
            <PropertyEnclosure advanced={this.props.advanced || false} errors={this.props.errors}>
                {content}
            </PropertyEnclosure>
        );
    }
}

@observer
export class NumberInputProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: number;
        onChange: (value: number) => void;
        advanced?: boolean;
        errors?: string[];
        min?: number;
        max?: number;
    },
    {}
> {
    render() {
        return (
            <InputProperty
                {...this.props}
                type="number"
                onChange={value => this.props.onChange(parseInt(value))}
            />
        );
    }
}

@observer
export class RichTextProperty extends React.Component<
    {
        name: string;
        value?: string;
        onChange: (value: string) => void;
        advanced?: boolean;
    },
    {}
> {
    constructor(props: any) {
        super(props);
    }

    refs: {
        div: HTMLDivElement;
    };

    quill: any;

    componentDidMount() {
        const Quill = require("quill");

        this.quill = new Quill(this.refs.div, {
            theme: "snow"
        });

        if (this.props.value) {
            try {
                this.quill.setContents({
                    ops: JSON.parse(this.props.value)
                } as any);
            } catch (err) {
                console.error(err);
            }
        }

        this.quill.on("text-change", () => {
            this.props.onChange(JSON.stringify(this.quill.getContents().ops));
        });
    }

    render() {
        return (
            <PropertyEnclosure advanced={this.props.advanced || false}>
                <td colSpan={2}>
                    <div ref="div" className="EezStudio_RichTextProperty" />
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class StaticRichTextProperty extends React.Component<
    {
        name?: string;
        value: string;
        advanced?: boolean;
    },
    {}
> {
    constructor(props: any) {
        super(props);
    }

    refs: {
        div: HTMLDivElement;
    };

    quill: any;

    componentDidMount() {
        const Quill = require("quill");

        this.quill = new Quill(this.refs.div, {
            modules: {
                toolbar: false
            },
            theme: "snow"
        });

        this.setContents(this.props.value);

        this.quill.enable(false);
    }

    componentWillReceiveProps(nextProps: any) {
        this.setContents(nextProps.value);
    }

    setContents(value: string) {
        try {
            this.quill.setContents({
                ops: JSON.parse(value)
            } as any);
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        return (
            <PropertyEnclosure advanced={this.props.advanced || false}>
                <td colSpan={2}>
                    <div ref="div" className="EezStudio_StaticRichTextProperty" />
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class SelectProperty extends React.Component<
    {
        id?: string;
        name: string;
        value: string;
        onChange: (value: string) => void;
        inputGroupButton?: JSX.Element;
        advanced?: boolean;
        selectStyle?: React.CSSProperties;
        errors?: string[];
    },
    {}
> {
    render() {
        let id = this.props.id || guid();

        let className = classNames({
            "input-group": this.props.inputGroupButton !== undefined
        });

        return (
            <PropertyEnclosure advanced={this.props.advanced || false} errors={this.props.errors}>
                <td>
                    <label className="PropertyName col-form-label" htmlFor={id}>
                        {this.props.name}
                    </label>
                </td>

                <td>
                    <div className={className}>
                        <select
                            id={id}
                            className="form-control"
                            value={this.props.value}
                            onChange={event => this.props.onChange(event.target.value)}
                            style={this.props.selectStyle}
                        >
                            {this.props.children}
                        </select>
                        {this.props.inputGroupButton}
                    </div>
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class SelectFromListProperty extends React.Component<
    {
        id?: string;
        name?: string;
        nodes: IListNode[];
        renderNode?: (node: IListNode) => JSX.Element;
        onChange: (value: IListNode) => void;
        advanced?: boolean;
        errors?: string[];
    },
    {}
> {
    render() {
        let id = this.props.id || guid();

        return (
            <PropertyEnclosure advanced={this.props.advanced || false} errors={this.props.errors}>
                <td colSpan={2}>
                    {this.props.name && (
                        <label className="PropertyName col-form-label" htmlFor={id}>
                            {this.props.name}
                        </label>
                    )}

                    <ListContainer tabIndex={0} minHeight={240} maxHeight={400}>
                        <List
                            nodes={this.props.nodes}
                            renderNode={this.props.renderNode}
                            selectNode={this.props.onChange}
                        />
                    </ListContainer>
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class BooleanProperty extends React.Component<
    {
        name: string;
        value: boolean;
        onChange: (value: boolean) => void;
        advanced?: boolean;
        style?: React.CSSProperties;
    },
    {}
> {
    render() {
        return (
            <PropertyEnclosure advanced={this.props.advanced || false} style={this.props.style}>
                <td colSpan={2}>
                    <div className="form-check">
                        <label className="form-check-label">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={this.props.value}
                                onChange={event => this.props.onChange(event.target.checked)}
                            />
                            {this.props.name}
                        </label>
                    </div>
                </td>
            </PropertyEnclosure>
        );
    }
}

@observer
export class KeybindingProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: string;
        onChange: (value: string) => void;
        advanced?: boolean;
        errors?: string[];
    },
    {}
> {
    constructor(props: any) {
        super(props);

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    onKeyDown(event: any) {
        if (
            event.nativeEvent.key === "Escape" ||
            event.nativeEvent.key === "Enter" ||
            event.nativeEvent.key === "Tab"
        ) {
            return;
        }

        event.preventDefault();

        var keybinding = [];

        if (event.nativeEvent.ctrlKey) {
            keybinding.push("ctrl");
        }

        if (event.nativeEvent.shiftKey) {
            keybinding.push("shift");
        }

        if (event.nativeEvent.altKey) {
            keybinding.push("alt");
        }

        if (event.nativeEvent.metaKey) {
            keybinding.push("meta");
        }

        let key = event.nativeEvent.key;
        if (key !== "Control" && key !== "Shift" && key !== "Alt" && key !== "Meta") {
            if (key === " ") {
                key = "space";
            }

            keybinding.push(key.toLowerCase());
        } else {
            keybinding.push("");
        }

        this.props.onChange(keybinding.join("+"));
    }

    @computed
    get keybinding() {
        return (
            (this.props.value &&
                this.props.value
                    .split("+")
                    .map(x => capitalize(x))
                    .join(" + ")) ||
            ""
        );
    }

    @bind
    onDeleteKeybinding(event: any) {
        event.preventDefault();
        event.stopPropagation();
        this.props.onChange("");
    }

    render() {
        let id = this.props.id || guid();

        let input = (
            <input
                id={id}
                className="form-control"
                type="text"
                value={this.keybinding}
                onKeyDown={this.onKeyDown}
                onChange={event => this.props.onChange(event.target.value)}
            />
        );

        if (this.props.value) {
            input = (
                <div className="input-group">
                    {input}
                    <div className="input-group-append">
                        <button
                            className="btn btn-secondary"
                            title="Clear"
                            onClick={this.onDeleteKeybinding}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            );
        }

        let content;
        if (this.props.name) {
            content = [
                <td key="name">
                    <label className="PropertyName col-form-label" htmlFor={id}>
                        {this.props.name}
                    </label>
                </td>,
                <td key="value">{input}</td>
            ];
        } else {
            content = <td colSpan={2}>{input}</td>;
        }

        return (
            <PropertyEnclosure advanced={this.props.advanced || false} errors={this.props.errors}>
                {content}
            </PropertyEnclosure>
        );
    }
}

@observer
export class ColorInputProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: string;
        onChange: (value: string) => void;
        advanced?: boolean;
        errors?: string[];
    },
    {}
> {
    render() {
        return <InputProperty {...this.props} type="color" />;
    }
}

@observer
export class PropertyList extends React.Component<
    { className?: string; withAdvancedProperties?: boolean },
    {}
> {
    @observable
    showAdvanced = false;

    constructor(props: any) {
        super(props);
        this.toggleShowAdvanced = this.toggleShowAdvanced.bind(this);
    }

    @action
    toggleShowAdvanced() {
        this.showAdvanced = !this.showAdvanced;
    }

    render() {
        let className = classNames("EezStudio_PropertyList", this.props.className, {
            showAdvanced: this.showAdvanced
        });

        return (
            <table className={className}>
                <tbody>
                    {this.props.children}
                    {this.props.withAdvancedProperties && (
                        <tr>
                            <td colSpan={2}>
                                <a href="#" onClick={this.toggleShowAdvanced}>
                                    {this.showAdvanced
                                        ? "< Hide advanced properties"
                                        : "Show advanced properties >"}
                                </a>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    }
}

export class Checkbox extends React.Component<
    {
        checked: boolean;
        onChange: (checked: boolean) => void;
    },
    {}
> {
    render() {
        const id = guid();
        return (
            <div className="form-check">
                <input
                    type="checkbox"
                    className="form-check-input"
                    id={id}
                    checked={this.props.checked}
                    onChange={event => {
                        this.props.onChange(event.target.checked);
                    }}
                />
                <label className="form-check-label" htmlFor={id}>
                    {this.props.children}
                </label>
            </div>
        );
    }
}

export class Radio extends React.Component<
    {
        checked: boolean;
        onChange: () => void;
    },
    {}
> {
    render() {
        const id = guid();
        return (
            <div className="form-check">
                <input
                    type="radio"
                    id={id}
                    className="form-check-input"
                    checked={this.props.checked}
                    onChange={event => {
                        this.props.onChange();
                    }}
                />
                <label className="form-check-label" htmlFor={id}>
                    {this.props.children}
                </label>
            </div>
        );
    }
}

@observer
export class RangeProperty extends React.Component<
    {
        id?: string;
        name?: string;
        value: number;
        onChange: (value: number) => void;
        advanced?: boolean;
        errors?: string[];
        min?: number;
        max?: number;
    },
    {}
> {
    render() {
        return (
            <InputProperty
                {...this.props}
                type="range"
                onChange={value => this.props.onChange(parseInt(value))}
            />
        );
    }
}
