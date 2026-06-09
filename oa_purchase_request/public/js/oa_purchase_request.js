frappe.ui.form.on("OA Purchase Request", {
	before_save(frm) {
		return set_missing_manual_oa_code(frm);
	},
	refresh(frm) {
		frm.__show_empty_fields = frm.__show_empty_fields || false;
		hide_legacy_fields(frm);
		set_empty_fields_visibility(frm, frm.__show_empty_fields);
		render_oa_sidebar_links(frm);
		render_oa_logistics_field_link(frm);

		if (!frm.is_new() && can_create_purchase_order(frm)) {
			frm.add_custom_button(__("生成采购订单"), () => {
				show_purchase_order_dialog(frm);
			});
		}

		frm.add_custom_button(__(frm.__show_empty_fields ? "隐藏空字段" : "显示空字段"), () => {
			frm.__show_empty_fields = !frm.__show_empty_fields;
			hide_legacy_fields(frm);
			set_empty_fields_visibility(frm, frm.__show_empty_fields);
			frm.refresh();
		});
	},
	oa_logistics_code(frm) {
		render_oa_sidebar_links(frm);
		render_oa_logistics_field_link(frm);
	},
});

function show_purchase_order_dialog(frm) {
	const dialog = new frappe.ui.Dialog({
		title: __("生成采购订单"),
		fields: [
			{
				fieldname: "supplier_name",
				label: __("供应商"),
				fieldtype: "Link",
				options: "Supplier",
				reqd: 1,
				ignore_link_validation: true,
			},
			{
				fieldname: "oa_logistics_item_code",
				label: __("OA国际物流编码"),
				fieldtype: "Data",
			},
			{
				fieldname: "oa_logistics_amount",
				label: __("金额"),
				fieldtype: "Currency",
			},
		],
		primary_action_label: __("生成"),
		primary_action(values) {
			dialog.hide();
			frappe.call({
				method:
					"oa_purchase_request.oa_purchase_request.oa_purchase_request.create_purchase_order",
				args: {
					docname: frm.doc.name,
					supplier_name: values.supplier_name,
					oa_logistics_item_code: values.oa_logistics_item_code,
					oa_logistics_amount: values.oa_logistics_amount,
				},
				freeze: true,
				freeze_message: __("正在生成采购订单..."),
				callback(response) {
					if (!response.message) {
						return;
					}

					frm.reload_doc();
					frappe.show_alert({
						message: __("采购订单 {0} 已生成", [response.message.purchase_order]),
						indicator: "green",
					});
				},
			});
		},
	});

	dialog.show();
}

function can_create_purchase_order(frm) {
	return (
		!frm.doc.purchase_order &&
		!["Closed", "Purchase Order Created"].includes(frm.doc.sync_status)
	);
}

function set_missing_manual_oa_code(frm) {
	if (frm.doc.oa_code) {
		return;
	}

	return frm.set_value("oa_code", make_manual_oa_code());
}

function make_manual_oa_code() {
	const now = new Date();
	const pad = (value, length = 2) => String(value).padStart(length, "0");
	const timestamp = [
		now.getFullYear(),
		pad(now.getMonth() + 1),
		pad(now.getDate()),
		pad(now.getHours()),
		pad(now.getMinutes()),
		pad(now.getSeconds()),
		pad(now.getMilliseconds(), 3),
	].join("");
	const random = Math.floor(Math.random() * 1000);

	return `${timestamp}${pad(random, 3)}`;
}

function render_oa_sidebar_links(frm) {
	const wrapper = get_oa_sidebar_wrapper(frm);
	if (!wrapper) {
		return;
	}

	wrapper.empty();
	wrapper.attr("style", "padding: 10px 15px 2px; border-bottom: 1px solid var(--border-color);");
	wrapper.append(
		get_oa_sidebar_link_html({
			label: __("OA Purchase Request"),
			value: frm.doc.name,
			action: "purchase-request",
		})
	);

	if (frm.doc.oa_logistics_code) {
		wrapper.append(
			get_oa_sidebar_link_html({
				label: __("OA Logistics Code"),
				value: frm.doc.oa_logistics_code,
				action: "logistics-code",
			})
		);
	}
}

function get_oa_sidebar_wrapper(frm) {
	const sidebar = frm.sidebar?.wrapper || frm.page?.sidebar;
	if (!sidebar?.length) {
		return null;
	}

	let wrapper = sidebar.find(".oa-purchase-request-sidebar-links");
	if (!wrapper.length) {
		wrapper = $('<div class="oa-purchase-request-sidebar-links form-sidebar-section"></div>');
		const insert_after = sidebar.find(".form-sidebar-stats, .sidebar-image-section").last();
		if (insert_after.length) {
			wrapper.insertAfter(insert_after);
		} else {
			sidebar.prepend(wrapper);
		}
	}

	return wrapper;
}

function get_oa_sidebar_link_html({ label, value, action }) {
	const safe_label = frappe.utils.escape_html(label);
	const safe_value = frappe.utils.escape_html(value || "");
	const safe_action = frappe.utils.escape_html(action);

	return `
		<div class="oa-sidebar-link-row flex align-center justify-between" style="gap: 8px; min-height: 38px; margin-bottom: 6px;">
			<div style="min-width: 0; flex: 1;">
				<div class="text-muted small" style="line-height: 1.2;">${safe_label}</div>
				<div class="ellipsis text-medium" title="${safe_value}" style="line-height: 1.4;">${safe_value}</div>
			</div>
			<a href="#" class="oa-sidebar-dingtalk-link text-muted" data-oa-action="${safe_action}"
				title="${frappe.utils.escape_html(__("打开钉钉审批"))}"
				onclick="return open_oa_sidebar_dingtalk_approval(event, this);"
				style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex: 0 0 26px;">
				${get_external_link_icon_html()}
			</a>
		</div>
	`;
}

function render_oa_logistics_field_link(frm) {
	const field = frm.fields_dict.oa_logistics_code;
	if (!field?.$wrapper?.length) {
		return;
	}

	const label = field.$wrapper.find("label.control-label").first();
	if (!label.length) {
		return;
	}

	label.find(".oa-logistics-field-link").remove();
	if (!frm.doc.oa_logistics_code) {
		return;
	}

	label.css("padding-right", "5px");
	label.append(`
		<a href="#" class="oa-logistics-field-link" title="${frappe.utils.escape_html(__("打开钉钉审批"))}"
			onclick="return open_oa_logistics_field_approval(event, this);"
			style="display: inline-flex; vertical-align: text-bottom; margin-left: 6px;">
			${get_external_link_icon_html()}
		</a>
	`);
}

function get_external_link_icon_html() {
	return `
		<svg class="icon icon-sm" style="stroke: currentColor;" aria-hidden="true">
			<use href="#icon-external-link"></use>
		</svg>
	`;
}

window.open_oa_sidebar_dingtalk_approval = function (event, element) {
	event.preventDefault();
	event.stopPropagation();

	const frm = cur_frm;
	const action = $(element).data("oa-action");
	if (action === "purchase-request") {
		open_oa_purchase_request_approval(frm);
	} else if (action === "logistics-code") {
		open_oa_logistics_approval_by_code(frm.doc.oa_logistics_code);
	}

	return false;
};

window.open_oa_logistics_field_approval = function (event) {
	event.preventDefault();
	event.stopPropagation();
	open_oa_logistics_approval_by_code(cur_frm.doc.oa_logistics_code);
	return false;
};

function open_oa_purchase_request_approval(frm) {
	frappe.call({
		method:
			"oa_purchase_request.oa_purchase_request.oa_purchase_request.get_oa_purchase_request_dingtalk_url",
		args: { docname: frm.doc.name },
		freeze: true,
		freeze_message: __("正在打开钉钉审批..."),
		callback(response) {
			if (response.message?.dingtalk_url) {
				window.location.href = response.message.dingtalk_url;
			}
		},
	});
}

function open_oa_logistics_approval_by_code(oa_logistics_code) {
	if (!oa_logistics_code) {
		frappe.msgprint(__("缺少 OA Logistics Code"));
		return;
	}

	frappe.call({
		method:
			"oa_purchase_request.oa_purchase_request.oa_purchase_request.get_oa_logistics_dingtalk_url",
		args: { oa_logistics_code },
		freeze: true,
		freeze_message: __("正在打开钉钉审批..."),
		callback(response) {
			if (response.message?.dingtalk_url) {
				window.location.href = response.message.dingtalk_url;
			}
		},
	});
}

const LEGACY_FIELDS = [
	"attachments_json",
	"approval_history",
	"approval_status",
	"currency",
	"created_time",
	"creator",
	"creator_department",
	"form_name",
	"items_json",
	"odt",
	"oa_code",
	"payee",
	"payment_amount",
	"payment_date",
	"payment_terms",
	"payments_json",
	"processing_materials",
	"process_code",
	"process_instance_id",
	"processor_name",
	"processor_phone",
	"processor_qty",
	"processor_total_amount",
	"processor_unit_price",
	"processors_json",
	"raw_payload",
	"sales_order_no",
];

function hide_legacy_fields(frm) {
	for (const fieldname of LEGACY_FIELDS) {
		if (frm.fields_dict[fieldname]) {
			frm.set_df_property(fieldname, "hidden", 1);
		}
	}
}

function set_empty_fields_visibility(frm, show_empty_fields) {
	for (const field of frm.meta.fields || []) {
		if (!can_toggle_field(field)) {
			continue;
		}

		frm.set_df_property(field.fieldname, "hidden", !show_empty_fields && is_empty_value(frm.doc[field.fieldname]));
	}
}

function can_toggle_field(field) {
	const layout_fields = ["Section Break", "Column Break", "Tab Break", "HTML", "Button"];

	return field.fieldname && !layout_fields.includes(field.fieldtype) && !LEGACY_FIELDS.includes(field.fieldname);
}

function is_empty_value(value) {
	if (value === undefined || value === null || value === "") {
		return true;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	return false;
}
