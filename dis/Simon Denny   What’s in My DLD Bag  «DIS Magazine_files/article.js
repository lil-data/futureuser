

function getPage() {
  var m = window.location.hash.split('#/page/');
	return m ? m[1] : null;
}

function setImgRight() {
	$('.reveal').each(function() {
		var imgRight = (800 - $(this).find('img.over:eq(0)').width()) / 2;
		$(this).find('.img.over:eq(0)').css('right', (imgRight + 'px'));
		if (imgRight != 0) {
			$(this).find('.trigger:eq(0)').css('right', ((imgRight - 100) + 'px'));
		} 
		$(this).find('.aligcenter').css('right', (imgRight + 'px'));
	});
}

function revealUnder() {
	$('.reveal').each(function() {
		
		$(this).append('<span class="trigger">Reveal</span>');
		setImgRight();
		
		$('.trigger').hover(
			function() {
				$(this).siblings('img.over').slideUp();
				$(this).siblings('img.hidden').slideDown();
			},
			function() {
				$(this).siblings('img.over').slideDown();
				$(this).siblings('img.hidden').slideUp();
			}
		);
	});
	
}

jQuery(function( $ ) {
	
	var viewHeight = $(window).height();
	var space = (viewHeight - 600) / 2;
	var storyView = 223 - space;
	
	//if (!$('#horizontal')) {
		//$(window).scrollTo({top: storyView}, 1600, { easing: 'easeOutElastic'});
	//}
	
	$('#content div.wp-caption p').wrap('<div class="caption-wrapper" />');
	
	//Paginated Articles
	if ($('#paginated')) {
		$('#paginated #content').serialScroll({
			items:'.page', // Selector to the items ( relative to the matched elements, '#sections' in this case )
			prev:'#pagePrev a',// Selector to the 'prev' button (absolute!, meaning it's relative to the document)
			next:'#pageNext a',// Selector to the 'next' button (absolute too)
			axis:'y',// The default is 'y' scroll on both ways
			duration:400, // Length of the animation (if you scroll 2 axes and use queue, then each axis take half this time)
			cycle: false,
			onAfter: function() {
				$('#content div.wp-caption').each(function (i) { 
					imgWidth = $(this).find('img').outerWidth();
					capWidth = (imgWidth - 16) + 'px';
					$(this).find('.caption-wrapper').css( {
						'width': capWidth
					} );
							
				});
				
			}
		});
		
		if (getPage()) {
			pg = getPage();
			pg = pg - 1;
			$('#content').trigger('goto', [pg]);
		}
	}
	
	
	//Horizontal articles
	var pages = $('.page').length;
	var pagesWidth = 0;
	$('#horizontal .page').each(function() {
		pagesWidth += $(this).outerWidth( true );
	});
	
	$('#horizontal #content .post').width(pagesWidth);
	
	/*
	if ($('#horizontal')) {
		$.scrollTo(storyView, 1000, { easing: 'linear', onAfter: function() {
				$('#horizontal #content').scrollTo('.page:eq(1)', 1600, { easing: 'easeOutBack', onAfter: function() {
						$('#horizontal #content').scrollTo('.page:eq(0)', 1600, { easing: 'easeOutBounce' });
					}
				});
			} 
		});
	}
	*/
			
	revealUnder();	
	
	/*
	$('.single .entry img, .blogPost img').not('a img, .shortPost img, .category-mixes img, .category-releases img').each(function() {
		var $el = $(this);
		if($el.is('.wp-caption img')) {
			$el.closest('.wp-caption').addClass('pinterest-button');
		} else {
			var classes = $el.attr('class');
			$el.wrap('<span class="pinterest-button ' + classes +'" />');
		}
		
		var $headline = $el.closest('.post').find('h1:eq(0)');
		if($headline.is('#headline')) {
			var href = $headline.attr('data-permalink');
		} else {
			var href = $headline.find('a:eq(0)').attr('href');
		}
		
		var src = $el.attr('src');
		src = src.split(/-\d+x\d+\./);
		if(src.length > 1) {
		
			src = src[0] + '.' + src[1];
		}

		
		$el.after('<a href="http://pinterest.com/pin/create/button/?url=' + href + '&amp;media=' + src + '&amp;description=' + $headline.text() + 
			'" class="pin-it-button" count-layout="horizontal" target="_blank"><img border="0" src="//assets.pinterest.com/images/PinExt.png" title="Pin It" /></a>');
		
		$el.attr('class', '');
		
	});*/
	
	
});
