frappe.ui.form.on("OA Purchase Request", {
	refresh(frm) {
		frm.__show_empty_fields = frm.__show_empty_fields || false;
		hide_legacy_fields(frm);
		set_empty_fields_visibility(frm, frm.__show_empty_fields);

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
	return !frm.doc.purchase_order && frm.doc.sync_status !== "Purchase Order Created";
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
